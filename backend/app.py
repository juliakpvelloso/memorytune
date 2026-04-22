from flask import Flask, redirect, request, jsonify, session
from dotenv import load_dotenv
import os
from datetime import datetime
import threading
import time

# Custom Modules
from auth_manager import AuthManager
from spotify_client import SpotifyClient
from recommendation_engine import RecommendationEngine
from firebase_client import (
    init_firebase,
    is_firebase_ready,
    sync_now_playing,
    save_patient_spotify_tokens,
    verify_id_token,
    get_caregiver,
    get_patient,
    update_patient,
    list_patients_for_caregiver,
    upsert_caregiver,
    create_patient_for_caregiver,
)

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "fallback-secret-key")

load_dotenv()
init_firebase()

##TODO: 
## 1) Error catching for gemini with high demand
## 2) Constant reloading queue
## 3) Get user analytics and feed to firebase for caregiver dashboard

# Initialize our logic managers
auth_manager = AuthManager(
    client_id=os.getenv("CLIENT_ID"),
    client_secret=os.getenv("CLIENT_SECRET")
)

session_clients = {}

def background_session_tracker():
    """Continuously updates session time for all active users."""
    while True:
        for client in session_clients.values():
            try:
                client.update_session_time()
            except Exception as e:
                print(f"Tracking error: {e}")
        time.sleep(2)  # update every 2 seconds

def get_spotify_client():
    """Helper to get an authorized client or None if unauthorized."""
    # First, try to get token from session (normal flow)
    token = auth_manager.get_token(session.get("firebase_patient_id"))
    if token:
        user_id = session.get("firebase_patient_id") or "default"
        if user_id in session_clients:
            return session_clients[user_id]
        client = SpotifyClient(token)
        client.start_session_tracking()
        session_clients[user_id] = client
        return client
    
    # Fallback: check Authorization header for direct Spotify token (for API calls)
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        user_id = session.get("firebase_patient_id") or "header-auth"
        if user_id in session_clients:
            return session_clients[user_id]
        client = SpotifyClient(token)
        client.start_session_tracking()
        session_clients[user_id] = client
        return client
    
    return None


def _verified_caregiver_uid_from_header():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    return verify_id_token(auth_header[7:])


def _resolve_active_patient_id() -> str | None:
    pid = session.get("firebase_patient_id")
    if pid:
        return pid
    caregiver_uid = session.get("firebase_uid")
    if caregiver_uid:
        patients = list_patients_for_caregiver(caregiver_uid)
        if patients:
            pid = patients[0].get("_id")
            if pid:
                session["firebase_patient_id"] = pid
                return pid
    return None

@app.route('/')
def index():
    return "<h1>MemoryTune Dev Server</h1><p><a href='/playback'>Start Playback</a></p>"

@app.route('/login')
def login():
    # 1. Capture the patient_id from the URL if provided
    patient_id = request.args.get('patient_id')
    if patient_id:
        session['firebase_patient_id'] = patient_id

    # 2. Get the redirect URI from your environment variables
    redirect_uri = os.getenv("REDIRECT_URI")
    
    # 3. Redirect the user to Spotify
    return redirect(auth_manager.get_auth_url(redirect_uri))

@app.route('/callback')
def callback():
    # 1. Check for errors from Spotify (e.g., user clicked "Cancel")
    if 'error' in request.args:
        return jsonify({"error": request.args['error']})
    
    code = request.args.get('code')
    if not code:
        return "No code provided", 400

    # 2. Exchange the code for real tokens
    token_info = auth_manager.exchange_code_for_tokens(code, os.getenv("REDIRECT_URI"))
    if not token_info:
        return "Failed to retrieve tokens", 500

    # 3. Store in Flask Session (for the current browser window)
    session['access_token'] = token_info['access_token']
    session['refresh_token'] = token_info.get('refresh_token')
    session['expires_at'] = datetime.now().timestamp() + token_info['expires_in']

    # 4. Persist to Firebase (for background sync / other devices)
    pid = session.get('firebase_patient_id')
    if pid and is_firebase_ready():
        save_patient_spotify_tokens(pid, token_info)
    
    access_token = token_info['access_token']

    return redirect(f"memorytune://login-success?token={access_token}")

@app.route('/playback')
def playback():
    # 1. Retrieve the patient_id from the session
    patient_id = session.get("firebase_patient_id")
    
    # 2. Get authorized client
    spotify = get_spotify_client()
    if not spotify:
        # If we have no token, we need to log in (optionally passing the ID back)
        login_url = f"/login?patient_id={patient_id}" if patient_id else "/login"
        return redirect(login_url)

    # 3. Ensure a device is active
    devices = spotify.get_devices()
    if not devices:
        return "No active devices found. Please open Spotify on a device first.", 404
    
    ##device_id = devices[0]['id']
    ##spotify.transfer_playback(device_id)

    # 4. Generate recommendations using the patient's specific context
    engine = RecommendationEngine()
    # 'recently_played' is passed to avoid repeats
    tracks = engine.get_recommendations_for_patient(patient_id, session.get('history', []))

    for t in tracks:
        print(f"Queueing: {t.song} by {t.artist}")
        uri = spotify.search_track(f"{t.song} {t.artist}")
        if uri:
            # Passing device_id ensures it queues to the right place
            print(f"Found URI: {uri} for {t.song} by {t.artist}")
            spotify.add_to_queue(uri)
    #spotify.skip_to_next()  # Skip to the first recommendation immediately
    return redirect('/home')

@app.route('/pause')
def pause():
    spotify = get_spotify_client()
    if not spotify:
        return redirect('/login')

    # The client's _request method handles the PUT logic internally
    spotify._request("PUT", "me/player/pause")
    return redirect('/home')

@app.route('/home')
def home():
    spotify = get_spotify_client()
    # 1. Fetch live data from Spotify
    track_info = spotify.get_currently_playing() if spotify else None
    
    display_text = "No music is currently playing."
    
    # 2. Extract song/artist if data exists
    if track_info and track_info.get("item"):
        item = track_info["item"]
        song_name = item.get("name")
        artist_name = item.get("artists", [{}])[0].get("name")
        display_text = f"Now Playing: <strong>{song_name}</strong> by {artist_name}"

        # Sync to Firebase if we have a valid patient
        pid = session.get("firebase_patient_id")
        if pid and is_firebase_ready():
            sync_now_playing(pid, song_name, artist_name)

    # 3. Build the UI with Play/Pause buttons
    return f"""
    <h1>MemoryTune</h1>
    <p>{display_text}</p>
    <hr>
    <div style="margin-top: 20px;">
        <a href="/playback"><button style="padding: 10px 20px;">▶ Play / Resume</button></a>
        <a href="/pause"><button style="padding: 10px 20px;">⏸ Pause</button></a>
    </div>
    <br>
    <a href="/login">Switch Account / Login</a>
    """

@app.route('/auth/firebase', methods=['POST'])
def auth_firebase():
    """Authenticates a Caregiver via Firebase ID Token and sets the session."""
    data = request.get_json(silent=True) or {}
    token = data.get('idToken') or ''
    
    # Support both JSON body and Authorization header
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = token or auth_header[7:]
        
    if not token:
        return jsonify({"error": "missing id token"}), 400
        
    uid = verify_id_token(token)
    if not uid:
        return jsonify({"error": "invalid token"}), 401
        
    session['firebase_uid'] = uid
    return jsonify({"ok": True, "uid": uid})


@app.route('/api/caregiver/bootstrap', methods=['POST'])
def api_caregiver_bootstrap():
    """Ensure caregiver profile doc exists at first sign-up/login."""
    uid = _verified_caregiver_uid_from_header()
    if not uid:
        return jsonify({"error": "invalid token"}), 401
    if not is_firebase_ready():
        return jsonify({"error": "firebase not configured"}), 503
    body = request.get_json(silent=True) or {}
    upsert_caregiver(
        uid,
        {
            "name": body.get("name", ""),
            "email": body.get("email", ""),
        },
    )
    session["firebase_uid"] = uid
    return jsonify({"ok": True, "caregiver_id": uid})


@app.route('/api/caregiver/patients', methods=['GET'])
def api_caregiver_patients():
    """Returns the caregiver profile and their associated patient list."""
    uid = _verified_caregiver_uid_from_header()
    if not uid:
        return jsonify({"error": "invalid token"}), 401
        
    if not is_firebase_ready():
        return jsonify({"error": "firebase not configured"}), 503
        
    # Fetch data from Firestore
    cg = get_caregiver(uid)
    patients = list_patients_for_caregiver(uid)
    
    return jsonify({
        "caregiver": {
            "id": uid,
            "name": (cg or {}).get("name"),
            "age": (cg or {}).get("age"),
            "patientIds": (cg or {}).get("patientIds"),
        },
        "patients": patients,
    })


@app.route('/api/caregiver/patients', methods=['POST'])
def api_create_caregiver_patient():
    uid = _verified_caregiver_uid_from_header()
    if not uid:
        return jsonify({"error": "invalid token"}), 401
    if not is_firebase_ready():
        return jsonify({"error": "firebase not configured"}), 503

    payload = request.get_json(silent=True) or {}
    patient_doc = {
        "name": payload.get("name", ""),
        "birthYear": str(payload.get("birth_year", "")),
        "profileImage": payload.get("profile_image", ""),
        "musicalPreference": {
            "eraPreferences": payload.get("era_preferences", []),
            "favArtists": payload.get("fav_artists", []),
            "favGenres": payload.get("fav_genres", []),
            "blacklistedSongs": payload.get("blocked_songs", []),
            "blacklistedArtists": payload.get("blocked_artists", []),
        },
    }
    patient_id = create_patient_for_caregiver(uid, patient_doc)
    if not patient_id:
        return jsonify({"error": "unable to create patient"}), 500
    session["firebase_uid"] = uid
    session["firebase_patient_id"] = patient_id
    return jsonify({"ok": True, "patient_id": patient_id})


@app.route('/api/caregiver/select-patient', methods=['POST'])
def api_select_patient():
    uid = _verified_caregiver_uid_from_header()
    if not uid:
        return jsonify({"error": "invalid token"}), 401
    body = request.get_json(silent=True) or {}
    patient_id = body.get("patient_id")
    if not patient_id:
        return jsonify({"error": "patient_id required"}), 400

    patient = get_patient(patient_id) or {}
    if patient.get("caregiverId") != uid:
        return jsonify({"error": "patient does not belong to caregiver"}), 403

    session["firebase_uid"] = uid
    session["firebase_patient_id"] = patient_id
    return jsonify({"ok": True, "patient_id": patient_id})

# ── JSON API endpoints (consumed by React Native app) ─────────────────────────

@app.route('/api/token', methods=['GET'])
def api_token():
    """Returns whether the session has a valid Spotify token."""
    token = auth_manager.get_token(session.get("firebase_patient_id"))
    if token:
        return jsonify({"authenticated": True, "access_token": token})
    return jsonify({"authenticated": False})


@app.route('/api/currently-playing', methods=['GET'])
def api_currently_playing():
    spotify = get_spotify_client()
    if not spotify:
        return jsonify({"error": "not authenticated"}), 401
    
    data = spotify.get_currently_playing()
    if not data or not data.get("item"):
        return jsonify({"song": None, "artist": None, "is_playing": False})
    
    item = data["item"]
    song = item.get("name")
    artist = item.get("artists", [{}])[0].get("name")
    
    # Extract the album cover URL
    # images[0] is typically the highest resolution (640x640)
    images = item.get("album", {}).get("images", [])
    album_cover = images[0].get("url") if images else None
    
    is_playing = data.get("is_playing", False)
    progress_ms = data.get("progress_ms")
    duration_ms = item.get("duration_ms")
    
    pid = session.get("firebase_patient_id")
    if pid and is_firebase_ready():
        sync_now_playing(pid, song, artist)
        
    return jsonify({
        "song": song,
        "artist": artist,
        "album_cover": album_cover,  # New field
        "is_playing": is_playing,
        "progress_ms": progress_ms,
        "duration_ms": duration_ms,
        "album_cover": album_cover
    })


@app.route('/api/play', methods=['POST'])
def api_play():
    spotify = get_spotify_client()
    if not spotify:
        return jsonify({"error": "not authenticated"}), 401
    pid = session.get("firebase_patient_id")
    print(f"Starting playback for patient {pid}")
    engine = RecommendationEngine()
    tracks = engine.get_recommendations_for_patient(pid, session.get('history', []))
    if len(tracks) == 0:
        print(f"No recommendations found for patient {pid}, playing era-based playlist if available.")
        p = get_patient(pid) or {}
        print(f"Patient data: {p}")
        mp = p.get("musicalPreference", {})
        eras = mp.get("eraPreferences", [])
        decade = "1990s"
        if len(eras) > 0:
            decade = eras[0]
        spotify.play_decade_playlist(decade)
    else:
        print(f"Generated {len(tracks)} recommendations for patient {pid}")
        for i, t in enumerate(tracks):  # Added enumerate()
            uri = spotify.search_track(f"{t.song} {t.artist}")
            if uri:
                spotify.add_to_queue(uri)
                if i == 0:
                    spotify.skip_to_next()
    result = spotify._request("PUT", "me/player/play")
    return jsonify({"status": "playing", **({} if "error" not in result else {"error": result["error"]})})


@app.route('/api/pause', methods=['POST'])
def api_pause():
    spotify = get_spotify_client()
    if not spotify:
        return jsonify({"error": "not authenticated"}), 401
    result = spotify._request("PUT", "me/player/pause")
    return jsonify({"status": "paused", **({} if "error" not in result else {"error": result["error"]})})


@app.route('/api/skip-next', methods=['POST'])
def api_skip_next():
    spotify = get_spotify_client()
    if not spotify:
        return jsonify({"error": "not authenticated"}), 401
    result = spotify.skip_to_next()
    return jsonify({"status": "skipped", **({} if "error" not in result else {"error": result["error"]})})


@app.route('/api/skip-prev', methods=['POST'])
def api_skip_prev():
    spotify = get_spotify_client()
    if not spotify:
        return jsonify({"error": "not authenticated"}), 401
    result = spotify._request("POST", "me/player/previous")
    return jsonify({"status": "skipped", **({} if "error" not in result else {"error": result["error"]})})


@app.route('/api/listening-insights', methods=['GET'])
def api_listening_insights():
    """
    Returns patient-specific listening insights for caregiver view.
    period:
      - day (default)
      - week
      - month
      - year
    """
    pid = _resolve_active_patient_id()
    if not pid:
        return jsonify({"error": "no patient session"}), 401

    patient = get_patient(pid) or {}
    prefs = patient.get("musicalPreference", {})

    period = (request.args.get("period") or "day").lower()
    if period not in {"day", "week", "month", "year"}:
        period = "day"

    # Firestore-first metrics
    today_minutes = int(patient.get("listeningTodayMinutes", 0) or 0)
    totals = patient.get("listeningTotals", {}) or {}
    period_minutes = int(totals.get(period, 0) or 0)
    if period == "day" or period_minutes <= 0:
        period_minutes = today_minutes

    top_artists = patient.get("topArtists", []) or prefs.get("favArtists", []) or []
    top_genres = patient.get("topGenres", []) or prefs.get("favGenres", []) or []
    eras = prefs.get("eraPreferences", []) or []
    blocked_songs = prefs.get("blacklistedSongs", []) or []
    blocked_artists = prefs.get("blacklistedArtists", []) or []

    top_song = {
        "song": patient.get("mostPlayedSong", "") or patient.get("nowPlayingSong", ""),
        "artist": patient.get("mostPlayedArtist", "") or patient.get("nowPlayingArtist", ""),
    }

    # Optional Spotify enrichment when token is available
    spotify = get_spotify_client()
    if spotify:
        time_range_map = {
            "day": "short_term",
            "week": "short_term",
            "month": "medium_term",
            "year": "long_term",
        }
        most_played = spotify.get_most_played_song(
            time_range=time_range_map.get(period, "medium_term")
        )
        if most_played:
            top_song = {
                "song": most_played.get("song", top_song["song"]),
                "artist": most_played.get("artist", top_song["artist"]),
            }

    return jsonify(
        {
            "patient": {
                "id": pid,
                "name": patient.get("name", ""),
                "birth_year": str(patient.get("birthYear", "")),
            },
            "period": period,
            "minutes_listened": period_minutes,
            "minutes_today": today_minutes,
            "top_song": top_song,
            "top_artists": top_artists[:5],
            "top_genres": top_genres[:5],
            "era_preferences": eras,
            "blacklist": {
                "songs_count": len(blocked_songs),
                "artists_count": len(blocked_artists),
            },
            "last_played": {
                "song": patient.get("nowPlayingSong", ""),
                "artist": patient.get("nowPlayingArtist", ""),
            },
        }
    )


@app.route('/api/user-profile', methods=['GET', 'POST'])
def api_user_profile():
    pid = _resolve_active_patient_id()
    if not pid:
        return jsonify({"error": "no patient session"}), 401
    if request.method == 'GET':
        patient = get_patient(pid) or {}
        prefs = patient.get("musicalPreference", {})
        pb = prefs.get("playbackPreferences", {})
        return jsonify({
            "name": patient.get("name", ""),
            "birth_year": str(patient.get("birthYear", "")),
            "profile_image": patient.get("profileImage", ""),
            "era": prefs.get("era", ""),
            "fav_artists": prefs.get("favArtists", []),
            "fav_genres": prefs.get("favGenres", []),
            "blocked_songs": prefs.get("blacklistedSongs", []),
            "blocked_artists": prefs.get("blacklistedArtists", []),
            "era_preferences": prefs.get("eraPreferences", []),
            "playback_preferences": {
                "continuous_playback": pb.get("continuousPlayback", True),
                "gentle_transition": pb.get("gentleTransition", True),
                "allow_explicit": pb.get("allowExplicit", False),
            },
            "listening_today_minutes": patient.get("listeningTodayMinutes", 0),
            "last_played": patient.get("nowPlayingSong", ""),
        })
    # POST — partial updates
    updates = request.get_json(silent=True) or {}
    firestore_updates: dict = {}
    if "name" in updates:
        firestore_updates["name"] = updates["name"]
    if "birth_year" in updates:
        firestore_updates["birthYear"] = updates["birth_year"]
    if "profile_image" in updates:
        firestore_updates["profileImage"] = updates["profile_image"]
    if "era" in updates:
        firestore_updates["musicalPreference.era"] = updates["era"]
    if "fav_artists" in updates:
        firestore_updates["musicalPreference.favArtists"] = updates["fav_artists"]
    if "fav_genres" in updates:
        firestore_updates["musicalPreference.favGenres"] = updates["fav_genres"]
    if "blocked_songs" in updates:
        firestore_updates["musicalPreference.blacklistedSongs"] = updates["blocked_songs"]
    if "blocked_artists" in updates:
        firestore_updates["musicalPreference.blacklistedArtists"] = updates["blocked_artists"]
    if "era_preferences" in updates:
        firestore_updates["musicalPreference.eraPreferences"] = updates["era_preferences"]
    if "playback_preferences" in updates:
        pb = updates["playback_preferences"]
        firestore_updates["musicalPreference.playbackPreferences.continuousPlayback"] = pb.get("continuous_playback", True)
        firestore_updates["musicalPreference.playbackPreferences.gentleTransition"] = pb.get("gentle_transition", True)
        firestore_updates["musicalPreference.playbackPreferences.allowExplicit"] = pb.get("allow_explicit", False)
    if firestore_updates and is_firebase_ready():
        update_patient(pid, firestore_updates)
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    tracker_thread = threading.Thread(target=background_session_tracker, daemon=True)
    tracker_thread.start()
    app.run(host='0.0.0.0', port=5001, debug=True)

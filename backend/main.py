"""Practice File for Spotify API"""
from flask import Flask, redirect, request, jsonify, session
from dotenv import load_dotenv
import os
import requests
import urllib
from datetime import datetime
import time

from gemini_utils import ask_gemini, create_prompt
from firebase_client import (
    init_firebase,
    is_firebase_ready,
    get_patient,
    get_caregiver,
    list_patients_for_caregiver,
    save_patient_spotify_tokens,
    sync_now_playing,
    verify_id_token,
    get_valid_patient_spotify_access_token,
)

app = Flask(__name__)
app.secret_key = '48608404894-585ghng-q2185960-344940fh2'

load_dotenv()
init_firebase()

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")
redirect_uri = os.getenv("REDIRECT_URI")

AUTH_URL = "https://accounts.spotify.com/authorize" 
TOKEN_URL =  "https://accounts.spotify.com/api/token" 
API_BASE_URL = "https://api.spotify.com/v1/"

DEFAULT_USER_CONTEXT = {
    "USER_BIRTHDAY": "1990-01-01",
    "USER_FAV_ARTISTS": ["The Beatles", "Taylor Swift", "Kendrick Lamar"],
    "USER_FAV_GENRES": ["rock", "pop", "hip-hop"],
    "USER_BLACKLISTED_SONGS": [""],
    "USER_BLACKLISTED_ARTISTS": ["Justin Bieber"],
    "USER_ERA_PREFERENCES": ["1990s"],
    "PLAYBACK_PREFERENCES": {
        "continuous_playback": True,
        "gentle_transition": True,
        "allow_explicit": False,
    },
}

RECENTLY_PLAYED_TRACKS = []


def get_active_patient_id() -> str:
    """Firestore `patients/{id}` used for prefs, playback sync, and optional stored Spotify tokens."""
    return (session.get("firebase_patient_id") or os.getenv("FIREBASE_PATIENT_ID") or "").strip()


def get_user_context():
    pid = get_active_patient_id()
    if pid and is_firebase_ready():
        p = get_patient(pid)
        if p:
            mp = p.get("musicalPreference") or {}
            blacklisted = p.get("blacklistedSongs")
            if blacklisted is None:
                blacklisted = DEFAULT_USER_CONTEXT["USER_BLACKLISTED_SONGS"]
            return {
                "USER_BIRTHDAY": p.get("birthday")
                or DEFAULT_USER_CONTEXT["USER_BIRTHDAY"],
                "USER_FAV_ARTISTS": mp.get("favArtists")
                or DEFAULT_USER_CONTEXT["USER_FAV_ARTISTS"],
                "USER_FAV_GENRES": mp.get("favGenres")
                or DEFAULT_USER_CONTEXT["USER_FAV_GENRES"],
                "USER_BLACKLISTED_SONGS": blacklisted,
                "USER_BLACKLISTED_ARTISTS": mp.get("blacklistedArtists")
                or DEFAULT_USER_CONTEXT["USER_BLACKLISTED_ARTISTS"],
                "USER_ERA_PREFERENCES": mp.get("eraPreferences")
                or DEFAULT_USER_CONTEXT["USER_ERA_PREFERENCES"],
                "PLAYBACK_PREFERENCES": dict(
                    DEFAULT_USER_CONTEXT["PLAYBACK_PREFERENCES"]
                ),
            }
    return dict(DEFAULT_USER_CONTEXT)


def spotify_access_token():
    """Prefer an unexpired Flask session token; otherwise use Firestore patientSecrets (Admin)."""
    if session.get("access_token") and datetime.now().timestamp() <= session.get(
        "expires_at", 0
    ):
        return session["access_token"]
    pid = get_active_patient_id()
    if pid and is_firebase_ready():
        tok = get_valid_patient_spotify_access_token(pid)
        if tok:
            return tok
    return None

##helper functions 
def activate_device():
    token = spotify_access_token()
    if not token:
        raise Exception("No Spotify access token. Log in or configure patient OAuth in Firestore.")
    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Get available devices
    devices_response = requests.get(
        "https://api.spotify.com/v1/me/player/devices",
        headers=headers
    )

    devices_data = devices_response.json()

    if not devices_data["devices"]:
        raise Exception("No Spotify devices found. Open Spotify and play something first.")
    
    for d in devices_data["devices"]:
        print(d["name"], d["id"], d["is_active"])

    # Pick the first device
    device_id = devices_data["devices"][0]["id"]

    # Transfer playback to that device
    transfer_body = {
        "device_ids": [device_id],
        "play": False
    }

    requests.put(
        "https://api.spotify.com/v1/me/player",
        json=transfer_body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )

    return device_id

def get_currently_playing():
    token = spotify_access_token()
    if not token:
        return None

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
       API_BASE_URL+ "me/player/currently-playing",
        headers=headers
    )

    if response.status_code != 200:
        return {"error": response.text}

    data = response.json()

    if not data or data.get("item") is None:
        return {"message": "Nothing currently playing"}

    track_name = data["item"]["name"]
    artist_names = ", ".join(artist["name"] for artist in data["item"]["artists"])

    return {
        "song": track_name,
        "artist": artist_names
    }

def get_recommendations():
    print("Generating recommendations with Gemini...")
    ctx = get_user_context()
    prompt = create_prompt(
        fav_genres=ctx["USER_FAV_GENRES"],
        fav_artists=ctx["USER_FAV_ARTISTS"],
        blocked_songs=ctx["USER_BLACKLISTED_SONGS"],
        blocked_artists=ctx["USER_BLACKLISTED_ARTISTS"],
        eras=ctx["USER_ERA_PREFERENCES"],
        recently_played=RECENTLY_PLAYED_TRACKS
    )

    response = ask_gemini(prompt)
    print(f"Gemini response: {response}")
    # FIX: If ask_gemini returned response.parsed, it's already a list!
    if isinstance(response, list):
        return response
    
    # Fallback only if it's a string (for safety)
    try:
        import json
        return json.loads(response)
    except:
        print("Failed to parse Gemini response, returning empty list")
        return []

def song_to_uri(song_name, artist_name):
    query = f"{song_name} {artist_name}"
    token = spotify_access_token()
    if not token:
        return None
    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        f"{API_BASE_URL}search",
        headers=headers,
        params={"q": query, "type": "track"}
    )

    data = response.json()
    if data["tracks"]["items"]:
        return data["tracks"]["items"][0]["uri"]
    return None

def add_to_queue(song_name, artist_name, device_id):
    # 1. Convert the names to a Spotify URI (assuming your song_to_uri function works)
    uri = song_to_uri(song_name, artist_name)

    print(f"Adding to queue: {song_name} by {artist_name} (URI: {uri})")
    
    if uri:
        token = spotify_access_token()
        if not token:
            return
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # 2. Construct the URL with query parameters
        # Spotify requires 'uri' and 'device_id' in the URL string itself
        endpoint = f"{API_BASE_URL}me/player/queue?uri={uri}&device_id={device_id}"

        try:
            # 3. Use POST instead of PUT
            response = requests.post(endpoint, headers=headers)
            
            # Check for success (Spotify returns 204 No Content on success)
            if response.status_code in [200, 204]:
                print(f"Successfully queued: {song_name} by {artist_name}")
            else:
                print(f"Failed to queue. Status: {response.status_code}, Error: {response.text}")
                
        except Exception as e:
            print(f"Network error adding to queue: {e}")
    else:
        print(f"Could not find URI for {song_name} by {artist_name}")

def manage_queue(device_id):
    print("Managing queue...")
    # Initialize session flag
    if 'queue_initialized' not in session:
        session['queue_initialized'] = False

    token = spotify_access_token()
    if not token:
        return
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    # 🔥 STEP 1: Clear queue ONCE
    if not session['queue_initialized']:
        requests.put(
            API_BASE_URL + f"me/player/play?device_id={device_id}",
            json={"uris": []},  # clears playback context
            headers= headers 
        )

        session['queue_initialized'] = True
        print("Queue cleared")

    # 🔥 STEP 2: Check if we need more songs
    # Since we can't read queue, just refill periodically

    recommendations = get_recommendations()

    if recommendations:
        # Play the first song immediately to start the music
        first = recommendations[0]
        # You'll need a song_to_uri helper here
        first_uri = song_to_uri(first.song, first.artist)
    
        requests.put(
            f"{API_BASE_URL}me/player/play?device_id={device_id}",
            json={"uris": [first_uri]},
            headers=headers
        )

         # Queue the rest normally
        for rec in recommendations[1:]:
            add_to_queue(rec.song, rec.artist, device_id)

@app.route('/')
def index():
    return (
        "Welcome to MemoryTune. <a href='/login'>Login with Spotify</a>. "
        "Optional: open <code>/login?patient_id=YOUR_FIRESTORE_PATIENT_DOC_ID</code> "
        "so tokens and playback sync to that patient."
    )


@app.route('/auth/firebase', methods=['POST'])
def auth_firebase():
    data = request.get_json(silent=True) or {}
    token = data.get('idToken') or ''
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


@app.route('/api/caregiver/patients', methods=['GET'])
def api_caregiver_patients():
    """Caregiver name, age, patient list (profiles only — no OAuth secrets)."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "missing bearer token"}), 401
    uid = verify_id_token(auth_header[7:])
    if not uid:
        return jsonify({"error": "invalid token"}), 401
    if not is_firebase_ready():
        return jsonify({"error": "firebase not configured"}), 503
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


@app.route('/login')
def login():
    patient_id = request.args.get('patient_id')
    if patient_id:
        session['firebase_patient_id'] = patient_id

    scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state user-read-currently-playing' ##change scopes

    params = {
        'client_id': client_id,
        'response_type' : 'code',
        'scope' : scope,
        'redirect_uri': redirect_uri,
        'show_dialog': True ##just for testing, remove
    }

    auth_url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"

    return redirect(auth_url)

@app.route('/callback')
def callback():
    if 'error' in request.args:
        return jsonify({"error": request.args['error']})
    
    if 'code' in request.args:
        req_body = {
            'code': request.args['code'],
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri,
            'client_id': client_id,
            'client_secret': client_secret
        }

        response = requests.post(TOKEN_URL, data=req_body)
        token_info = response.json()

        session['access_token'] = token_info['access_token']
        session['refresh_token'] = token_info['refresh_token']
        session['expires_at'] = datetime.now().timestamp() + token_info['expires_in']

        pid = get_active_patient_id()
        if pid and is_firebase_ready():
            save_patient_spotify_tokens(pid, token_info)

        return redirect('/home')

@app.route('/home')
def home():
    track_info = get_currently_playing()

    pid = get_active_patient_id()
    if pid and is_firebase_ready():
        if track_info and "song" in track_info:
            sync_now_playing(pid, track_info['song'], track_info['artist'])
        else:
            sync_now_playing(pid, None, None)

    if track_info and "song" in track_info:
        now_playing = f"Now playing: {track_info['song']} — {track_info['artist']}"
    else:
        now_playing = "Nothing currently playing"

    return f"""
    <h1>MemoryTune Player</h1>

    <p>{now_playing}</p>

    <a href="/playback">
        <button>Play</button>
    </a>

    <a href="/pause">
        <button>Pause</button>
    </a>
    """

@app.route('/playback')
def playback():
    print("Activating playback...")
    if not spotify_access_token():
        return redirect('/login')

    device_id = activate_device()

    # Manage queue (clear once + refill)
    manage_queue(device_id)

    time.sleep(1)
    return redirect('/home')

    

@app.route('/pause')
def pause():
    if not spotify_access_token():
        return redirect('/login')

    device_id = activate_device()

    token = spotify_access_token()
    response = requests.put(
        API_BASE_URL + "me/player/pause?device_id=" +device_id,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )

    time.sleep(1)
    return redirect('/home')

@app.route('/refresh-token')
def refresh_token():
    if 'refresh_token' not in session:
        return redirect('/login')
    
    if datetime.now().timestamp() > session['expires_at']:
        req_body = {
            'grant_type': 'refresh_token',
            'refresh_token': session['refresh_token'],
            'client_id': client_id,
            'client_secret': client_secret
        }

        response = requests.post(TOKEN_URL, data=req_body)
        new_token_info = response.json()

        session['access_token'] = new_token_info['access_token']
        session['expires_at'] = datetime.now().timestamp() + new_token_info['expires_in']

    return redirect('/home')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
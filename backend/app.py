from flask import Flask, redirect, request, jsonify, session
from dotenv import load_dotenv
import os
from datetime import datetime

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
    list_patients_for_caregiver
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

def get_spotify_client():
    """Helper to get an authorized client or None if unauthorized."""
    token = auth_manager.get_token(session.get("firebase_patient_id"))
    return SpotifyClient(token) if token else None

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

    return redirect('/home')

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


@app.route('/api/caregiver/patients', methods=['GET'])
def api_caregiver_patients():
    """Returns the caregiver profile and their associated patient list."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "missing bearer token"}), 401
        
    # Verify the Caregiver's identity
    uid = verify_id_token(auth_header[7:])
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
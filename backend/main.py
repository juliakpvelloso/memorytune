"""MemoryTune Backend – Flask + Spotify + Gemini AI"""
from flask import Flask, redirect, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
import urllib
from datetime import datetime
import time

from gemini_utils import ask_gemini, create_prompt

load_dotenv()

app = Flask(__name__)
app.secret_key = '48608404894-585ghng-q2185960-344940fh2'

# Allow requests from the React Native app (localhost on simulator, or LAN IP on device)
CORS(app, supports_credentials=True, origins='*')

client_id     = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")
redirect_uri  = os.getenv("REDIRECT_URI")

AUTH_URL     = "https://accounts.spotify.com/authorize"
TOKEN_URL    = "https://accounts.spotify.com/api/token"
API_BASE_URL = "https://api.spotify.com/v1/"

# ── Global token store ────────────────────────────────────────────────────────
# After the browser OAuth flow completes the token is stored here so the
# React Native app can retrieve it via GET /api/token.
_global_access_token  = None
_global_refresh_token = None
_global_expires_at    = None

# ── Mutable user profile (in-memory; swap for Firebase/DB to persist) ─────────
user_profile = {
    "name":          "Margaret Thompson",
    "birth_year":    "1947",
    "era":           "1960s",
    "fav_artists":   ["The Beatles", "Taylor Swift", "Kendrick Lamar"],
    "fav_genres":    ["rock", "pop", "hip-hop"],
    "blocked_songs":   [],
    "blocked_artists": ["Justin Bieber"],
    "era_preferences": ["1960s"],
    "playback_preferences": {
        "continuous_playback": True,
        "gentle_transition":   True,
        "allow_explicit":      False,
    },
    "listening_today_minutes": 42,
    "last_played": "Beyond the Sea",
}

RECENTLY_PLAYED_TRACKS = []


# ── Token helpers ─────────────────────────────────────────────────────────────

def get_token():
    """
    Resolves the Spotify access token from three sources in priority order:
    1. Authorization: Bearer <token> header  (React Native clients)
    2. Flask session cookie                   (browser)
    3. Server-side global store               (post-OAuth fallback for mobile)
    """
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    if 'access_token' in session:
        return session['access_token']
    return _global_access_token


def _auth_header(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ── Spotify helper functions ──────────────────────────────────────────────────

def activate_device(token):
    resp = requests.get(
        "https://api.spotify.com/v1/me/player/devices",
        headers={"Authorization": f"Bearer {token}"},
    )
    data = resp.json()
    if not data.get("devices"):
        raise Exception("No active Spotify devices found. Open Spotify on a device first.")

    device_id = data["devices"][0]["id"]
    requests.put(
        "https://api.spotify.com/v1/me/player",
        json={"device_ids": [device_id], "play": False},
        headers=_auth_header(token),
    )
    return device_id


def get_currently_playing(token):
    resp = requests.get(
        API_BASE_URL + "me/player/currently-playing",
        headers={"Authorization": f"Bearer {token}"},
    )
    if resp.status_code == 204:
        return {"message": "Nothing currently playing"}
    if resp.status_code != 200:
        return {"error": resp.text}

    data = resp.json()
    if not data or data.get("item") is None:
        return {"message": "Nothing currently playing"}

    return {
        "song":        data["item"]["name"],
        "artist":      ", ".join(a["name"] for a in data["item"]["artists"]),
        "progress_ms": data.get("progress_ms", 0),
        "duration_ms": data["item"].get("duration_ms", 0),
        "is_playing":  data.get("is_playing", False),
    }


def song_to_uri(song_name, artist_name, token):
    resp = requests.get(
        f"{API_BASE_URL}search",
        headers={"Authorization": f"Bearer {token}"},
        params={"q": f"{song_name} {artist_name}", "type": "track"},
    )
    items = resp.json().get("tracks", {}).get("items", [])
    return items[0]["uri"] if items else None


def add_to_queue(song_name, artist_name, device_id, token):
    uri = song_to_uri(song_name, artist_name, token)
    if not uri:
        print(f"  Could not find URI for '{song_name}' by {artist_name}")
        return
    endpoint = f"{API_BASE_URL}me/player/queue?uri={uri}&device_id={device_id}"
    resp = requests.post(endpoint, headers=_auth_header(token))
    if resp.status_code in [200, 204]:
        print(f"  Queued: {song_name} – {artist_name}")
    else:
        print(f"  Queue error {resp.status_code}: {resp.text}")


def get_recommendations():
    print("Asking Gemini for recommendations…")
    prompt = create_prompt(
        fav_genres=user_profile["fav_genres"],
        fav_artists=user_profile["fav_artists"],
        blocked_songs=user_profile["blocked_songs"],
        blocked_artists=user_profile["blocked_artists"],
        eras=user_profile["era_preferences"],
        recently_played=RECENTLY_PLAYED_TRACKS,
    )
    response = ask_gemini(prompt)
    return response if isinstance(response, list) else []


def manage_queue(device_id, token):
    headers = _auth_header(token)
    if not session.get('queue_initialized'):
        requests.put(
            API_BASE_URL + f"me/player/play?device_id={device_id}",
            json={"uris": []},
            headers=headers,
        )
        session['queue_initialized'] = True

    recommendations = get_recommendations()
    if not recommendations:
        print("No recommendations returned from Gemini.")
        return

    first_uri = song_to_uri(recommendations[0].song, recommendations[0].artist, token)
    if first_uri:
        requests.put(
            f"{API_BASE_URL}me/player/play?device_id={device_id}",
            json={"uris": [first_uri]},
            headers=headers,
        )
        user_profile["last_played"] = recommendations[0].song

    for rec in recommendations[1:]:
        add_to_queue(rec.song, rec.artist, device_id, token)


# ── Web OAuth endpoints ───────────────────────────────────────────────────────

@app.route('/')
def index():
    return "MemoryTune backend running. <a href='/login'>Connect Spotify</a>"


@app.route('/login')
def login():
    scope = (
        'user-read-private user-read-email '
        'user-modify-playback-state user-read-playback-state '
        'user-read-currently-playing'
    )
    params = {
        'client_id':     client_id,
        'response_type': 'code',
        'scope':         scope,
        'redirect_uri':  redirect_uri,
        'show_dialog':   True,
    }
    return redirect(f"{AUTH_URL}?{urllib.parse.urlencode(params)}")


@app.route('/callback')
def callback():
    global _global_access_token, _global_refresh_token, _global_expires_at

    if 'error' in request.args:
        return jsonify({"error": request.args['error']})

    code = request.args.get('code')
    if not code:
        return jsonify({"error": "No code in callback"}), 400

    resp = requests.post(TOKEN_URL, data={
        'code':          code,
        'grant_type':    'authorization_code',
        'redirect_uri':  redirect_uri,
        'client_id':     client_id,
        'client_secret': client_secret,
    })
    token_info = resp.json()

    access_token  = token_info['access_token']
    refresh_token = token_info['refresh_token']
    expires_at    = datetime.now().timestamp() + token_info['expires_in']

    # Browser session
    session['access_token']  = access_token
    session['refresh_token'] = refresh_token
    session['expires_at']    = expires_at

    # Global store – React Native polls GET /api/token to grab this
    _global_access_token  = access_token
    _global_refresh_token = refresh_token
    _global_expires_at    = expires_at

    return redirect('/home')


@app.route('/home')
def home():
    token = get_token()
    now_playing = "Nothing currently playing"
    if token:
        info = get_currently_playing(token)
        if info and "song" in info:
            now_playing = f"{info['song']} — {info['artist']}"

    preview = (_global_access_token[:20] + '…') if _global_access_token else 'Not connected'
    return f"""
    <h1>MemoryTune</h1>
    <p>Now playing: <strong>{now_playing}</strong></p>
    <a href="/playback"><button>▶ Play</button></a>&nbsp;
    <a href="/pause"><button>⏸ Pause</button></a>
    <hr><p>Mobile token: <code>{preview}</code></p>
    """


@app.route('/playback')
def playback():
    token = get_token()
    if not token:
        return redirect('/login')
    device_id = activate_device(token)
    manage_queue(device_id, token)
    time.sleep(1)
    return redirect('/home')


@app.route('/pause')
def pause_web():
    token = get_token()
    if not token:
        return redirect('/login')
    device_id = activate_device(token)
    requests.put(
        API_BASE_URL + f"me/player/pause?device_id={device_id}",
        headers=_auth_header(token),
    )
    time.sleep(1)
    return redirect('/home')


@app.route('/refresh-token')
def refresh_token_route():
    global _global_access_token, _global_expires_at
    refresh = session.get('refresh_token') or _global_refresh_token
    if not refresh:
        return redirect('/login')

    resp = requests.post(TOKEN_URL, data={
        'grant_type':    'refresh_token',
        'refresh_token': refresh,
        'client_id':     client_id,
        'client_secret': client_secret,
    })
    info = resp.json()
    session['access_token'] = info['access_token']
    session['expires_at']   = datetime.now().timestamp() + info['expires_in']
    _global_access_token    = info['access_token']
    _global_expires_at      = session['expires_at']
    return redirect('/home')


# ── JSON API (React Native) ───────────────────────────────────────────────────

@app.route('/api/token', methods=['GET'])
def api_token():
    """
    React Native calls this after the user completes Spotify OAuth in the
    system browser.  Returns the token that was captured in /callback.
    """
    if _global_access_token:
        return jsonify({
            "authenticated": True,
            "access_token":  _global_access_token,
            "expires_at":    _global_expires_at,
        })
    return jsonify({"authenticated": False, "access_token": None})


@app.route('/api/currently-playing', methods=['GET'])
def api_currently_playing():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated", "authenticated": False}), 401
    return jsonify(get_currently_playing(token) or {"message": "Nothing currently playing"})


@app.route('/api/play', methods=['POST'])
def api_play():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        device_id = activate_device(token)
        manage_queue(device_id, token)
        return jsonify({"status": "playing", "device_id": device_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/pause', methods=['POST'])
def api_pause():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        device_id = activate_device(token)
        requests.put(
            API_BASE_URL + f"me/player/pause?device_id={device_id}",
            headers=_auth_header(token),
        )
        return jsonify({"status": "paused"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/skip-next', methods=['POST'])
def api_skip_next():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        device_id = activate_device(token)
        requests.post(
            API_BASE_URL + "me/player/next",
            headers=_auth_header(token),
            params={"device_id": device_id},
        )
        return jsonify({"status": "skipped_next"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/skip-prev', methods=['POST'])
def api_skip_prev():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        device_id = activate_device(token)
        requests.post(
            API_BASE_URL + "me/player/previous",
            headers=_auth_header(token),
            params={"device_id": device_id},
        )
        return jsonify({"status": "skipped_prev"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user-profile', methods=['GET'])
def api_get_user_profile():
    return jsonify(user_profile)


@app.route('/api/user-profile', methods=['POST'])
def api_update_user_profile():
    data = request.get_json(silent=True) or {}
    allowed_keys = [
        'name', 'birth_year', 'era', 'fav_artists', 'fav_genres',
        'blocked_songs', 'blocked_artists', 'era_preferences',
        'playback_preferences',
    ]
    for key in allowed_keys:
        if key in data:
            user_profile[key] = data[key]
    return jsonify({"status": "updated", "profile": user_profile})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

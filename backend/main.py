"""Practice File for Spotify API"""
from flask import Flask, redirect, request, jsonify, session
from dotenv import load_dotenv
import os
import requests
import urllib
from datetime import datetime
import time

app = Flask(__name__)
app.secret_key = '48608404894-585ghng-q2185960-344940fh2'

load_dotenv()

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")
redirect_uri = os.getenv("REDIRECT_URI")

AUTH_URL = "https://accounts.spotify.com/authorize" 
TOKEN_URL =  "https://accounts.spotify.com/api/token" 
API_BASE_URL = "https://api.spotify.com/v1/"

##helper functions 
def activate_device():
    headers = {
        "Authorization": f"Bearer {session['access_token']}"
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
            "Authorization": f"Bearer {session['access_token']}",
            "Content-Type": "application/json"
        }
    )

    return device_id

def get_currently_playing():
    if 'access_token' not in session:
        return None

    headers = {
        "Authorization": f"Bearer {session['access_token']}"
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

@app.route('/')
def index():
    return "Welcome to my Spotify App <a href='/login'>Login with Spotify</a>"

@app.route('/login')
def login():
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

        return redirect('/home')

@app.route('/home')
def home():
    track_info = get_currently_playing()

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
    if 'access_token' not in session:
        return redirect('/login')

    if datetime.now().timestamp() > session['expires_at']:
        return redirect('/refresh-token')
    
    device_id = activate_device()

    req_body = {
        "uris": ["spotify:track:1sA1DhT0bLyeICf8NalPS7"]
    }

    response = requests.put(
        API_BASE_URL + "me/player/play?device_id=" +device_id,
        json=req_body,
        headers={
            "Authorization": f"Bearer {session['access_token']}",
            "Content-Type": "application/json"
        }
    )

    ##TODO: Add error state logic
    time.sleep(1)
    return redirect('/home')

    

@app.route('/pause')
def pause():
    if 'access_token' not in session:
        return redirect('/login')

    if datetime.now().timestamp() > session['expires_at']:
        return redirect('/refresh-token')
    
    device_id = activate_device()

    response = requests.put(
        API_BASE_URL + "me/player/pause?device_id=" +device_id,
        headers={
            "Authorization": f"Bearer {session['access_token']}",
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
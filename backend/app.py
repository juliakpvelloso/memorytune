from flask import Flask, redirect, request, jsonify, session
from dotenv import load_dotenv
import os
import urllib
import requests
from datetime import datetime
import time

import playback 

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")
redirect_uri = os.getenv("REDIRECT_URI")

AUTH_URL = "https://accounts.spotify.com/authorize" 
TOKEN_URL =  "https://accounts.spotify.com/api/token" 
API_BASE_URL = "https://api.spotify.com/v1/"

# TODO: 
# 1) Add skip function 
# 2) Add recently played function 
# 3) Add erorr handling for gemini calls

@app.route('/')
def index():
    return "Welcome to my Spotify App <a href='/login'>Login with Spotify</a>"

@app.route('/login')
def login():
    scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state user-read-currently-playing'
    params = {
        'client_id': client_id,
        'response_type' : 'code',
        'scope' : scope,
        'redirect_uri': redirect_uri,
        'show_dialog': True 
    }
    return redirect(f"{AUTH_URL}?{urllib.parse.urlencode(params)}")

@app.route('/callback')
def callback():
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
    return jsonify({"error": request.args.get('error')})

@app.route('/home')
def home():
    track_info = playback.get_currently_playing()
    now_playing = f"{track_info['song']} — {track_info['artist']}" if track_info and "song" in track_info else "Nothing playing"
    
    return f"""
    <h1>MemoryTune Player</h1>
    <p>Now playing: {now_playing}</p>
    <a href="/playback"><button>Play</button></a>
    <a href="/pause"><button>Pause</button></a>
    """

@app.route('/refresh-token')
def refresh_token():
    # ... (Keep refresh logic here as it's part of Auth)
    req_body = {
        'grant_type': 'refresh_token',
        'refresh_token': session['refresh_token'],
        'client_id': client_id,
        'client_secret': client_secret
    }
    response = requests.post(TOKEN_URL, data=req_body)
    new_info = response.json()
    session['access_token'] = new_info['access_token']
    session['expires_at'] = datetime.now().timestamp() + new_info['expires_in']
    return redirect('/home')

@app.route('/playback')
def start_playback():
    if 'access_token' not in session: return redirect('/login')
    if datetime.now().timestamp() > session.get('expires_at', 0): return redirect('/refresh-token')
    
    device_id = playback.activate_device()
    playback.manage_queue(device_id)
    time.sleep(1)
    return redirect('/home')

@app.route('/pause')
def pause_playback():
    if 'access_token' not in session: return redirect('/login')
    
    device_id = playback.activate_device()
    requests.put(
        f"{API_BASE_URL}me/player/pause?device_id={device_id}",
        headers={"Authorization": f"Bearer {session['access_token']}"}
    )
    time.sleep(1)
    return redirect('/home')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
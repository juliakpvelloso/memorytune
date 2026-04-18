import requests
import time
from flask import session
from gemini_utils import ask_gemini, create_prompt

# Constants moved from main or passed in
API_BASE_URL = "https://api.spotify.com/v1/"

# Mock Database / Preferences
USER_FAV_ARTISTS = ["The Beatles", "Taylor Swift", "Kendrick Lamar"]
USER_FAV_GENRES = ["rock", "pop", "hip-hop"]
USER_BLACKLISTED_SONGS = [""] 
USER_BLACKLISTED_ARTISTS = ["Justin Bieber"]
USER_ERA_PREFERENCES = ["1990s"]
RECENTLY_PLAYED_TRACKS = []

def activate_device():
    headers = {"Authorization": f"Bearer {session['access_token']}"}
    devices_response = requests.get(f"{API_BASE_URL}me/player/devices", headers=headers)
    devices_data = devices_response.json()

    if not devices_data.get("devices"):
        raise Exception("No Spotify devices found. Open Spotify and play something first.")
    
    device_id = devices_data["devices"][0]["id"]
    transfer_body = {"device_ids": [device_id], "play": False}

    requests.put(
        f"{API_BASE_URL}me/player",
        json=transfer_body,
        headers={"Authorization": f"Bearer {session['access_token']}", "Content-Type": "application/json"}
    )
    return device_id

def get_currently_playing():
    if 'access_token' not in session:
        return None

    headers = {"Authorization": f"Bearer {session['access_token']}"}
    response = requests.get(f"{API_BASE_URL}me/player/currently-playing", headers=headers)

    if response.status_code != 200:
        return {"error": response.text}

    data = response.json()
    if not data or data.get("item") is None:
        return {"message": "Nothing currently playing"}

    return {
        "song": data["item"]["name"],
        "artist": ", ".join(artist["name"] for artist in data["item"]["artists"])
    }

def get_recommendations():
    prompt = create_prompt(
        fav_genres=USER_FAV_GENRES,
        fav_artists=USER_FAV_ARTISTS,
        blocked_songs=USER_BLACKLISTED_SONGS,
        blocked_artists=USER_BLACKLISTED_ARTISTS,
        eras=USER_ERA_PREFERENCES,
        recently_played=RECENTLY_PLAYED_TRACKS
    )
    response = ask_gemini(prompt)
    return response if isinstance(response, list) else []

def song_to_uri(song_name, artist_name):
    headers = {"Authorization": f"Bearer {session['access_token']}"}
    response = requests.get(
        f"{API_BASE_URL}search",
        headers=headers,
        params={"q": f"{song_name} {artist_name}", "type": "track"}
    )
    data = response.json()
    return data["tracks"]["items"][0]["uri"] if data["tracks"]["items"] else None

def add_to_queue(song_name, artist_name, device_id):
    uri = song_to_uri(song_name, artist_name)
    if uri:
        headers = {"Authorization": f"Bearer {session.get('access_token')}"}
        endpoint = f"{API_BASE_URL}me/player/queue?uri={uri}&device_id={device_id}"
        requests.post(endpoint, headers=headers)

def manage_queue(device_id):
    if 'queue_initialized' not in session:
        session['queue_initialized'] = False

    headers = {"Authorization": f"Bearer {session['access_token']}", "Content-Type": "application/json"}
    
    if not session['queue_initialized']:
        requests.put(API_BASE_URL + f"me/player/play?device_id={device_id}", json={"uris": []}, headers=headers)
        session['queue_initialized'] = True

    recommendations = get_recommendations()
    if recommendations:
        first_uri = song_to_uri(recommendations[0].song, recommendations[0].artist)
        requests.put(f"{API_BASE_URL}me/player/play?device_id={device_id}", json={"uris": [first_uri]}, headers=headers)
        for rec in recommendations[1:]:
            add_to_queue(rec.song, rec.artist, device_id)
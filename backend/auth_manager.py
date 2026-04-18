import requests
import time
import urllib.parse
from flask import session
from datetime import datetime

class AuthManager:
    TOKEN_URL = "https://accounts.spotify.com/api/token"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret

    def get_token(self, patient_id: str = None) -> str:
        """
        The primary entry point. Resolves the best available token 
        from Session or Firestore and refreshes it if necessary.
        """
        # 1. Check Flask Session first (Fastest for the current web user)
        token = session.get("access_token")
        expires_at = session.get("expires_at", 0)

        if token and time.time() < expires_at:
            return token

        # 2. Check if we can refresh the Session token
        refresh_token = session.get("refresh_token")
        if refresh_token:
            new_info = self.refresh_spotify_token(refresh_token)
            if new_info:
                self._update_session(new_info)
                return new_info['access_token']

        # 3. Fallback: Check Firestore (Essential for background tasks or Admin)
        if patient_id:
            # This uses your existing firebase_client helper
            from firebase_client import get_valid_patient_spotify_access_token
            return get_valid_patient_spotify_access_token(patient_id)

        return None

    def refresh_spotify_token(self, refresh_token: str) -> dict:
        """Hits the Spotify API to swap a refresh_token for a new access_token."""
        data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        }
        response = requests.post(self.TOKEN_URL, data=data)
        if response.status_code == 200:
            return response.json()
        return None

    def _update_session(self, token_info: dict):
        """Helper to sync new tokens back into the Flask session."""
        session['access_token'] = token_info['access_token']
        # Note: Spotify doesn't always return a NEW refresh_token on every refresh
        if 'refresh_token' in token_info:
            session['refresh_token'] = token_info['refresh_token']
        session['expires_at'] = time.time() + token_info['expires_in']
    
    def get_auth_url(self, redirect_uri: str) -> str:
        scopes = [
            'user-read-private',
            'user-read-email',
            'user-modify-playback-state',
            'user-read-playback-state',
            'user-read-currently-playing',
            'user-top-read'
        ]
    
        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'scope': ' '.join(scopes),
            'redirect_uri': redirect_uri,
            'show_dialog': 'true'  # Useful for testing; set to 'false' for production
        }
    
        auth_url = "https://accounts.spotify.com/authorize"  # Spotify Auth Base URL
        return f"{auth_url}?{urllib.parse.urlencode(params)}"
        
    def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> dict:
        """Swaps the auth code for a token dictionary."""
        req_body = {
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri,
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }
    
        response = requests.post(self.TOKEN_URL, data=req_body)
        if response.status_code == 200:
            return response.json()
    
        print(f"Token Exchange Error: {response.text}")
        return None
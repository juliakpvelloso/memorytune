import requests
from typing import Optional, Dict, Any
import time

class SpotifyClient:
    BASE_URL = "https://api.spotify.com/v1/"

    def __init__(self, token: str):
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Internal helper to handle all API communication."""
        url = f"{self.BASE_URL}{endpoint.lstrip('/')}"
        try:
            response = self.session.request(method, url, **kwargs)
            
            # Spotify returns 204 No Content for successful PUT/POST queue actions
            if response.status_code == 204:
                return {"success": True}
            
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.HTTPError as e:
            # Specific handling for common Spotify errors
            status = e.response.status_code
            if status == 401:
                return {"error": "Unauthorized: Token likely expired."}
            if status == 403:
                return {"error": "Forbidden: Check your Scopes or Premium status."}
            if status == 404:
                return {"error": "Not Found: Is there an active device?"}
            return {"error": f"HTTP {status}: {response.text}"}
        except Exception as e:
            return {"error": str(e)}

    def get_devices(self) -> list:
        data = self._request("GET", "me/player/devices")
        return data.get("devices", [])

    def get_currently_playing(self) -> Dict[str, Any]:
        return self._request("GET", "me/player/currently-playing")

    def search_track(self, query: str) -> Optional[str]:
        """Returns the first track URI found for a query."""
        params = {"q": query, "type": "track", "limit": 1}
        data = self._request("GET", "search", params=params)
        items = data.get("tracks", {}).get("items", [])
        return items[0]["uri"] if items else None

    def add_to_queue(self, uri: str, device_id: Optional[str] = None) -> Dict[str, Any]:
        params = {"uri": uri}
        if device_id:
            params["device_id"] = device_id
        return self._request("POST", "me/player/queue", params=params)
    
    def skip_to_next(self) -> Dict[str, Any]:
        return self._request("POST", "me/player/next")

    def transfer_playback(self, device_id: str, force_play: bool = False) -> Dict[str, Any]:
        payload = {"device_ids": [device_id], "play": force_play}
        return self._request("PUT", "me/player", json=payload)
<<<<<<< Updated upstream
=======

    # getting total playing time
    def start_session_tracking(self):
        self._session_start_time = None
        self._last_update_time = None
        self._accumulated_ms = 0
        self._is_playing = False

    def update_session_time(self):
        """Call this every few seconds to track playback time."""
        data = self.get_currently_playing()

        if not data or "error" in data:
            return

        is_playing = data.get("is_playing", False)

        now = time.time()

        # If playback just started
        if is_playing and not self._is_playing:
            self._last_update_time = now

        # If playback is ongoing
        if is_playing and self._is_playing:
            elapsed = (now - self._last_update_time) * 1000  # convert to ms
            self._accumulated_ms += elapsed
            self._last_update_time = now

        # If playback stopped
        if not is_playing and self._is_playing:
            elapsed = (now - self._last_update_time) * 1000
            self._accumulated_ms += elapsed

        self._is_playing = is_playing
    
    def get_session_play_time(self) -> float:
        """Returns total listening time in seconds."""
        return self._accumulated_ms / 1000
    
    def get_session_stats(self):
        return {
            "total_time_sec": self.get_session_play_time(),
            "is_playing": self._is_playing
        }
    
    def get_top_tracks(self, limit: int = 10, time_range: str = "medium_term"):
        """
        time_range:
            - short_term  (~4 weeks)
            - medium_term (~6 months)
            - long_term   (years)
        """
        params = {
            "limit": limit,
            "time_range": time_range
        }

        data = self._request("GET", "me/top/tracks", params=params)

        if "error" in data:
            return []

        return data.get("items", [])

    def get_most_played_song(self, time_range: str = "medium_term"):
        tracks = self.get_top_tracks(limit=1, time_range=time_range)

        if not tracks:
            return None

        t = tracks[0]

        return {
            "song": t.get("name"),
            "artist": t.get("artists", [{}])[0].get("name"),
            "album": t.get("album", {}).get("name"),
            "popularity": t.get("popularity")
        }

    def search_decade_playlist(self, decade: str) -> Optional[str]:
        if not decade:
            return None
    
        query = f"{decade} hits"
        params = {"q": query, "type": "playlist", "limit": 5}
    
        data = self._request("GET", "search", params=params)

        # 1. Safety Check: If data is None or contains an error key
        if not data or "error" in data:
            print(f"Spotify API Error: {data.get('error', 'Unknown error')}")
            return None

        # 2. Defensive Digging: Use .get() safely at each level
        playlist_data = data.get("playlists")
        if not playlist_data:
            return None

        items = playlist_data.get("items", [])
    
        # 3. Final Check: Ensure we actually found a playlist
        if items and len(items) > 0:
            return items[0].get("uri")
        
        return None

    def play_decade_playlist(self, decade: str, device_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Searches for a decade playlist and starts playing it.
        Returns status dict with success/error information.
        """
        # Search for the decade playlist
        playlist_uri = self.search_decade_playlist(decade)
        
        if not playlist_uri:
            return {"error": f"No playlist found for {decade}"}
        
        # Start playing the playlist
        payload = {"context_uri": playlist_uri, "offset": {"position": 0}}
        if device_id:
            payload["device_id"] = device_id
        
        result = self._request("PUT", "me/player/play", json=payload)
        
        if "error" not in result:
            return {"status": "playing", "decade": decade, "playlist_uri": playlist_uri}
        
        return result

    
>>>>>>> Stashed changes
    
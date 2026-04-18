import requests
from typing import Optional, Dict, Any

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
    
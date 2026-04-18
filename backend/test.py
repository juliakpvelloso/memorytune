import time
from flask import Flask, session

from spotify_client import SpotifyClient
from auth_manager import AuthManager

# 🔑 use your env or paste here
CLIENT_ID = "d6471434febe4f7c936bf41551877949"
CLIENT_SECRET = "fe7fb33c96484550af1f7721aa8f12ac"

app = Flask(__name__)
app.secret_key = "dev"


def main():
    auth = AuthManager(CLIENT_ID, CLIENT_SECRET)

    with app.test_request_context("/"):
        # ✅ IMPORTANT: you must paste real tokens from your /callback flow
        session["access_token"] = "PASTE_ACCESS_TOKEN"
        session["refresh_token"] = "PASTE_REFRESH_TOKEN"
        session["expires_at"] = time.time() + 3600

        token = auth.get_token()

        if not token:
            print("❌ Failed to get token")
            return

        client = SpotifyClient(token)
        client.start_session_tracking()

        print("🎵 Session tracking started...\n")

        try:
            while True:
                client.update_session_time()

                total_time = client.get_session_play_time()
                current = client.get_currently_playing()

                print("=" * 50)
                print(f"Total Time: {round(total_time, 2)} sec")

                is_playing = current.get("is_playing", False) if current else False
                print(f"Playing: {is_playing}")

                if current and current.get("item"):
                    track = current["item"]["name"]
                    artist = current["item"]["artists"][0]["name"]
                    print(f"Now playing: {track} — {artist}")
                else:
                    print("Nothing playing")

                time.sleep(3)

        except KeyboardInterrupt:
            print("\n🛑 Stopped")
            print(f"Final Time: {round(client.get_session_play_time(), 2)} sec")


if __name__ == "__main__":
    main()
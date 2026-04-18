import os
from typing import List, Optional
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

# Import your Firebase helper from the other file
from firebase_client import get_patient 

load_dotenv()

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

class Song(BaseModel):
    song: str
    artist: str

class SongList(BaseModel):
    recommendations: List[Song]

class RecommendationEngine:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key)
        # Use the specific model version you need
        self.model_id = "gemini-2.5-flash" 

    def get_recommendations_for_patient(self, patient_id: Optional[str], recently_played: List[str] = None) -> List[Song]:
        """The high-level entry point used by your Flask routes."""
        # 1. Gather context from Firebase or use default
        context = self._build_context(patient_id)
        
        # 2. Generate the prompt
        prompt = self._generate_prompt(context, recently_played or [])
        
        # 3. Call Gemini
        return self._call_gemini(prompt)

    def _build_context(self, patient_id: Optional[str]) -> dict:
        """Transforms raw Firebase patient data into a clean dict for the prompt."""
        if patient_id:
            p = get_patient(patient_id) or {}
            mp = p.get("musicalPreference", {})
            
            return {
                "genres": mp.get("favGenres", []),
                "artists": mp.get("favArtists", []),
                "blocked_artists": mp.get("blacklistedArtists", []),
                "blocked_songs": p.get("blacklistedSongs", []),
                "eras": mp.get("eraPreferences", []),
            }
        else:
            # Use default context
            return {
                "genres": DEFAULT_USER_CONTEXT["USER_FAV_GENRES"],
                "artists": DEFAULT_USER_CONTEXT["USER_FAV_ARTISTS"],
                "blocked_artists": DEFAULT_USER_CONTEXT["USER_BLACKLISTED_ARTISTS"],
                "blocked_songs": DEFAULT_USER_CONTEXT["USER_BLACKLISTED_SONGS"],
                "eras": DEFAULT_USER_CONTEXT["USER_ERA_PREFERENCES"],
            }

    def _generate_prompt(self, ctx: dict, recently_played: List[str]) -> str:
        """Encapsulates the persona and rules for the AI."""
        return f"""
        You are a nostalgic music therapy assistant. Generate 20 song recommendations.
        
        USER PREFERENCES:
        - Favorite Genres: {', '.join(ctx['genres'])}
        - Favorite Artists: {', '.join(ctx['artists'])}
        - Preferred Eras: {', '.join(ctx['eras'])}
        
        STRICT RESTRICTIONS:
        - NEVER suggest these artists: {', '.join(ctx['blocked_artists'])}
        - NEVER suggest these specific songs: {', '.join(ctx['blocked_songs'])}
        - DO NOT suggest these recently played tracks: {', '.join(recently_played)}
        
        TASK:
        Provide a diverse list of tracks that align with their favorites but introduce 
        similar 'neighbor' artists they might enjoy. Focus on the requested eras.
        """

    def _call_gemini(self, prompt: str) -> List[Song]:
        """Handles the technical SDK call and JSON parsing."""
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": SongList,
                },
            )
            return response.parsed.recommendations if response.parsed else []
        except Exception as e:
            print(f"Gemini Error: {e}")
            return []
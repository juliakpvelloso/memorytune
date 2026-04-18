from google import genai
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# 1. Individual song object
class Song(BaseModel):
    song: str
    artist: str

# 2. NEW: The "Root" object that Gemini expects
class SongList(BaseModel):
    recommendations: List[Song]

def ask_gemini(prompt):
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                # Pass the Root class, NOT the List[Song]
                "response_schema": SongList, 
            },
        )
        
        if response.parsed:
            # We return just the list part so your other code stays the same
            return response.parsed.recommendations
        
        return []
        
    except Exception as e:
        print(f"An error occurred: {e}")
        return []
def create_prompt(fav_genres, fav_artists, blocked_songs, blocked_artists, eras, recently_played):
    """
    Creates a structured prompt for ChatGPT based on user input.
    
    Args:
        fav_genres (list): User's favorite genres
        fav_artists (list): User's favorite artists
        blocked_songs (list): Songs the user wants to avoid
        blocked_artists (list): Artists the user wants to avoid
        eras (list): Preferred music eras
        recently_played (list): Recently played songs
    
    Returns:
        str: A formatted prompt for ChatGPT
    """
    example_format = '[{"song": "Song Title", "artist": "Artist Name"}, ...]'
    prompt = f"""
    You are a helpful assistant that provides information about music and artists. 
    The user has asked you to return a list of 20 songs that match their preferences. Here are the details:
    - Favorite Genres: {', '.join(fav_genres)}
    - Favorite Artists: {', '.join(fav_artists)}
    - Blocked Artists: {', '.join(blocked_artists)}
    - Blocked Songs: {', '.join(blocked_songs)}
    - Preferred Eras: {', '.join(eras)}
    - Recently Played Songs: {', '.join(recently_played)}

    Use the favorite artists and genres to guide your recommendations, but feel free to include similar artists and genres. 
    Avoid all blocked_songs and blocked_artists.
    Focus on songs from the preferred eras, but you can include some modern songs if they fit the user's tastes.
    If you don't have enough information to make a recommendation, use the recently played songs as a hint to find similar tracks.
    Don't include any of the recently played songs in the final list of recommendations.
    Provide the recommendations in a simple list format, without any additional commentary or explanations.

    Example response format: {example_format}

    If you don't know the answer, say "I'm not sure, but I can help you find out!".
    """
    return prompt
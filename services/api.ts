/**
 * MemoryTune API Service
 *
 * All communication with the Flask backend lives here.
 *
 * BASE_URL for iOS Simulator → http://localhost:5001
 * BASE_URL for physical device → replace with your machine's local IP, e.g. http://192.168.1.x:5001
 * BASE_URL for Android emulator → http://10.0.2.2:5001
 */

const BASE_URL = 'http://localhost:5001';

// ── In-memory token store (survives navigation, resets on app kill) ───────────
let _spotifyToken: string | null = null;

// ── User Profile type ─────────────────────────────────────────────────────────
export interface UserProfile {
  name: string;
  birth_year: string;
  era: string;
  fav_artists: string[];
  fav_genres: string[];
  blocked_songs: string[];
  blocked_artists: string[];
  era_preferences: string[];
  playback_preferences: {
    continuous_playback: boolean;
    gentle_transition: boolean;
    allow_explicit: boolean;
  };
  listening_today_minutes: number;
  last_played: string;
}

export interface NowPlaying {
  song: string;
  artist: string;
  progress_ms?: number;
  duration_ms?: number;
  is_playing?: boolean;
  message?: string;
  error?: string;
}

// ── API client ────────────────────────────────────────────────────────────────
export const api = {
  /** Returns the Spotify OAuth URL to open in the system browser. */
  getLoginUrl(): string {
    return `${BASE_URL}/login`;
  },

  isAuthenticated(): boolean {
    return !!_spotifyToken;
  },

  /**
   * Polls the server for a valid Spotify token.
   * Call this when the user returns from the browser after OAuth.
   * Returns true if a token was successfully retrieved.
   */
  async fetchToken(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/token`, { method: 'GET' });
      const data = await res.json();
      if (data.authenticated && data.access_token) {
        _spotifyToken = data.access_token;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  _headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_spotifyToken) {
      h['Authorization'] = `Bearer ${_spotifyToken}`;
    }
    return h;
  },

  /** Get the currently playing track from Spotify. */
  async getCurrentlyPlaying(): Promise<NowPlaying> {
    const res = await fetch(`${BASE_URL}/api/currently-playing`, {
      headers: this._headers(),
    });
    return res.json();
  },

  /** Start AI-generated playback. */
  async play(): Promise<{ status: string; error?: string }> {
    const res = await fetch(`${BASE_URL}/api/play`, {
      method: 'POST',
      headers: this._headers(),
    });
    return res.json();
  },

  /** Pause playback. */
  async pause(): Promise<{ status: string; error?: string }> {
    const res = await fetch(`${BASE_URL}/api/pause`, {
      method: 'POST',
      headers: this._headers(),
    });
    return res.json();
  },

  /** Skip to next track. */
  async skipNext(): Promise<{ status: string; error?: string }> {
    const res = await fetch(`${BASE_URL}/api/skip-next`, {
      method: 'POST',
      headers: this._headers(),
    });
    return res.json();
  },

  /** Skip to previous track. */
  async skipPrev(): Promise<{ status: string; error?: string }> {
    const res = await fetch(`${BASE_URL}/api/skip-prev`, {
      method: 'POST',
      headers: this._headers(),
    });
    return res.json();
  },

  /** Load the full user profile from the server. */
  async getUserProfile(): Promise<UserProfile> {
    const res = await fetch(`${BASE_URL}/api/user-profile`, {
      headers: this._headers(),
    });
    return res.json();
  },

  /** Persist partial or full user profile updates. */
  async updateUserProfile(
    updates: Partial<UserProfile>,
  ): Promise<{ status: string; profile: UserProfile }> {
    const res = await fetch(`${BASE_URL}/api/user-profile`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(updates),
    });
    return res.json();
  },
};

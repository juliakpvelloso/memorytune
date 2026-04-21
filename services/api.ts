/**
 * MemoryTune API Service
 *
 * All communication with the Flask backend lives here.
 *
 * BASE_URL for iOS Simulator → http://localhost:5001
 * BASE_URL for physical device → replace with your machine's local IP, e.g. http://192.168.1.x:5001
 * BASE_URL for Android emulator → http://10.0.2.2:5001
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '../src/firebase/index';

function firebaseAuthErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

const BASE_URL = 'http://127.0.0.1:5001';

// ── In-memory token store (survives navigation, resets on app kill) ───────────
let _spotifyToken: string | null = null;
let _firebaseIdToken: string | null = null;

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
  album_cover?: string;
}

// ── API client ────────────────────────────────────────────────────────────────
export const api = {
  /** Returns the Spotify OAuth URL to open in the system browser. */
  getLoginUrl(patientId?: string): string {
    if (patientId) {
      return `${BASE_URL}/login?patient_id=${patientId}`;
    }
    return `${BASE_URL}/login`;
  },

  isAuthenticated(): boolean {
    return !!_spotifyToken;
  },

  isCaregiverAuthenticated(): boolean {
    return !!_firebaseIdToken;
  },

  setManualToken(token: string) {
    _spotifyToken = token;
  },

  /**
   * Sign a caregiver in with email + password via Firebase Auth,
   * then authenticate the Flask session via POST /auth/firebase.
   */
  async caregiverSignIn(email: string, password: string): Promise<boolean> {
    try {
      const auth = getFirebaseAuth();
      if (!auth) return false;
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      _firebaseIdToken = idToken;
      // Register the session with Flask
      const res = await fetch(`${BASE_URL}/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      return data.ok === true;
    } catch (e) {
      console.warn('caregiverSignIn error:', e);
      return false;
    }
  },

  /**
   * Register a new caregiver (Firebase Auth) and register the Flask session.
   */
  async caregiverSignUp(
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        return { ok: false, error: 'Firebase is not configured. Add keys to .env.' };
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      _firebaseIdToken = idToken;
      const res = await fetch(`${BASE_URL}/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (data.ok === true) {
        return { ok: true };
      }
      return { ok: false, error: 'Server could not verify your session.' };
    } catch (e: unknown) {
      const err = e as { code?: string };
      console.warn('caregiverSignUp error:', e);
      return {
        ok: false,
        error: firebaseAuthErrorMessage(err.code),
      };
    }
  },

  async caregiverSignOut(): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      if (auth) await signOut(auth);
    } catch { /* ignore */ }
    _firebaseIdToken = null;
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
    // Prefer Spotify token for playback calls; fall back to Firebase ID token for caregiver calls
    const token = _spotifyToken ?? _firebaseIdToken;
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
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

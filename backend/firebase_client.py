"""
Firestore: caregivers, patients (profile + prefs), patientSecrets (Spotify OAuth, Admin only).

React Native uses the Web app Firebase config; OAuth tokens never live in client-readable docs.
"""
from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional

import firebase_admin
import requests
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore

_db: Optional[firestore.Client] = None

TOKEN_URL = "https://accounts.spotify.com/api/token"


def is_firebase_ready() -> bool:
    return _db is not None


def init_firebase() -> None:
    global _db
    if _db is not None:
        return
    if firebase_admin._apps:
        _db = firestore.client()
        return

    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH") or os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS"
    )
    project_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")

    if not cred_path or not os.path.isfile(cred_path):
        print(
            "Firebase Admin: set FIREBASE_SERVICE_ACCOUNT_PATH (or GOOGLE_APPLICATION_CREDENTIALS) "
            "to the absolute path of your service account JSON from Firebase Console → "
            "Project settings → Service accounts → Generate new private key. "
            "/auth/firebase and Firestore will not work until this is set."
        )
        _db = None
        return

    try:
        cred = credentials.Certificate(cred_path)
        options = {}
        if project_id:
            options["projectId"] = project_id
        firebase_admin.initialize_app(cred, options)
        _db = firestore.client()
    except Exception as e:
        print(f"Firebase Admin not initialized: {e}")
        _db = None


def verify_id_token(id_token: str) -> Optional[str]:
    if not firebase_admin._apps or _db is None:
        return None
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded.get("uid")
    except Exception as e:
        print(f"verify_id_token: {e}")
        return None


def get_caregiver(caregiver_id: str) -> Optional[Dict[str, Any]]:
    if not _db or not caregiver_id:
        return None
    try:
        snap = _db.collection("caregivers").document(caregiver_id).get()
        return snap.to_dict() if snap.exists else None
    except Exception as e:
        print(f"get_caregiver: {e}")
        return None


def upsert_caregiver(
    caregiver_id: str,
    data: Optional[Dict[str, Any]] = None,
) -> None:
    if not _db or not caregiver_id:
        return
    try:
        payload = data or {}
        payload["updatedAt"] = firestore.SERVER_TIMESTAMP
        payload.setdefault("createdAt", firestore.SERVER_TIMESTAMP)
        _db.collection("caregivers").document(caregiver_id).set(payload, merge=True)
    except Exception as e:
        print(f"upsert_caregiver: {e}")


def get_patient(patient_id: str) -> Optional[Dict[str, Any]]:
    if not _db or not patient_id:
        return None
    try:
        snap = _db.collection("patients").document(patient_id).get()
        return snap.to_dict() if snap.exists else None
    except Exception as e:
        print(f"get_patient: {e}")
        return None


def create_patient_for_caregiver(
    caregiver_id: str,
    patient_data: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    if not _db or not caregiver_id:
        return None
    try:
        payload = patient_data or {}
        payload["caregiverId"] = caregiver_id
        payload["updatedAt"] = firestore.SERVER_TIMESTAMP
        payload.setdefault("createdAt", firestore.SERVER_TIMESTAMP)
        ref = _db.collection("patients").document()
        ref.set(payload, merge=True)
        return ref.id
    except Exception as e:
        print(f"create_patient_for_caregiver: {e}")
        return None


def get_patient_secrets(patient_id: str) -> Optional[Dict[str, Any]]:
    if not _db or not patient_id:
        return None
    try:
        snap = _db.collection("patientSecrets").document(patient_id).get()
        return snap.to_dict() if snap.exists else None
    except Exception as e:
        print(f"get_patient_secrets: {e}")
        return None


def save_patient_spotify_tokens(patient_id: str, token_info: Dict[str, Any]) -> None:
    if not _db or not patient_id:
        return
    try:
        expires_at = time.time() + float(token_info.get("expires_in", 3600))
        payload: Dict[str, Any] = {
            "accessToken": token_info.get("access_token", ""),
            "expiresAt": expires_at,
        }
        # Spotify refresh responses often omit refresh_token; do not clear an existing one.
        if token_info.get("refresh_token"):
            payload["refreshToken"] = token_info["refresh_token"]
        _db.collection("patientSecrets").document(patient_id).set(payload, merge=True)
    except Exception as e:
        print(f"save_patient_spotify_tokens: {e}")


def refresh_patient_spotify_access_token(patient_id: str) -> Optional[str]:
    """Refresh stored Spotify tokens using refresh_token; updates Firestore."""
    if not _db:
        return None
    secrets = get_patient_secrets(patient_id)
    if not secrets or not secrets.get("refreshToken"):
        return None
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    if not client_id or not client_secret:
        return None
    try:
        r = requests.post(
            TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": secrets["refreshToken"],
                "client_id": client_id,
                "client_secret": client_secret,
            },
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        save_patient_spotify_tokens(patient_id, data)
        return data.get("access_token")
    except Exception as e:
        print(f"refresh_patient_spotify_access_token: {e}")
        return None


def get_valid_patient_spotify_access_token(patient_id: str) -> Optional[str]:
    secrets = get_patient_secrets(patient_id)
    if not secrets:
        return None
    now = time.time()
    if secrets.get("accessToken") and secrets.get("expiresAt", 0) > now + 30:
        return secrets["accessToken"]
    return refresh_patient_spotify_access_token(patient_id)


def update_patient(patient_id: str, data: Dict[str, Any]) -> None:
    if not _db or not patient_id:
        return
    try:
        _db.collection("patients").document(patient_id).set(data, merge=True)
    except Exception as e:
        print(f"update_patient: {e}")


def sync_now_playing(
    patient_id: str,
    song: Optional[str],
    artist: Optional[str],
) -> None:
    if not _db or not patient_id:
        return
    try:
        _db.collection("patients").document(patient_id).set(
            {
                "nowPlayingSong": song or "",
                "nowPlayingArtist": artist or "",
            },
            merge=True,
        )
    except Exception as e:
        print(f"sync_now_playing: {e}")


def list_patients_for_caregiver(caregiver_id: str) -> List[Dict[str, Any]]:
    """Returns patient id + profile fields (no secrets)."""
    if not _db or not caregiver_id:
        return []
    try:
        q = _db.collection("patients").where("caregiverId", "==", caregiver_id)
        out: List[Dict[str, Any]] = []
        for doc in q.stream():
            row = doc.to_dict() or {}
            row["_id"] = doc.id
            out.append(row)
        return out
    except Exception as e:
        print(f"list_patients_for_caregiver: {e}")
        return []

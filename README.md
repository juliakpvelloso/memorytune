# MemoryTune

MemoryTune is a music-based memory and mood support tool designed for individuals with early-stage Alzheimer’s or dementia. The app provides a **simple, intuitive patient interface** and a **powerful caregiver backend**, ensuring that users can enjoy music safely and comfortably while caregivers can configure playlists and controls in advance.  

By minimizing complexity for patients and automating music management for caregivers, MemoryTune addresses a real-world healthcare and accessibility need, helping users experience music that is familiar, emotionally supportive, and calming.

## Team Members
- Hannah Black  
- Arinjoy Das  
- Himanish Kolli  
- Ayan Nair  
- Julia Velloso  

## App Overview

### Patient App (Primary Interface)
Designed to feel almost invisible, the patient app focuses on simplicity, accessibility, and emotional safety.  

**Core Principles:**
- Minimal interaction (zero or near-zero UI)
- High-contrast visuals for visual impairment
- No dead ends or error states
- Text-light screens

**Key Features:**
- **Single Play Button**: One large button that immediately starts music  
- **Decade Dial**: Optional dial to select music from a specific decade  
- **Automatic Playback**: Music continues without further input  
- **Fail-safe Design**: Music resumes automatically if a user stops interacting  
- Tablet-friendly designs for larger screens

### Caregiver App (Secondary Interface)
Provides backend control without requiring constant attention, allowing caregivers to configure music safely.  

**Key Features:**
- Patient profile setup using birth year  
- Reminiscence-based music curation  
- Trigger song blacklist to avoid distressing content  
- Mood presets: Morning (upbeat), Afternoon (neutral), Sundowning (calm)  

### Goals
**For Patients:**  
- Listen to music without frustration or confusion  
- Feel calm and comforted through familiar sounds  

**For Caregivers:**  
- Improve patient mood and reduce agitation  
- Configure music safely with minimal effort  

---

## Setup

To run the app locally on iOS:

```bash
# Install dependencies
yarn install

# Install iOS pods
cd ios && pod install && cd ..

# Launch on iOS simulator
npx react-native run-ios
```

## Firebase (Web app SDK + Firestore)

MemoryTune uses the **Firebase JavaScript (Web) SDK** in React Native (same config object as a Web app in the Firebase Console). Enable **Cloud Firestore**, **Authentication → Anonymous** (patient devices), and deploy `firestore.rules`.

### Data model

| Collection | Document | Fields |
|------------|----------|--------|
| **caregivers** | `{caregiverUid}` (Firebase Auth uid) | `name` (string), `age` (number), `patientIds` (optional string[] — denormalized ids) |
| **patients** | `{patientId}` — use the **patient device’s Firebase Auth uid** as the document id | `caregiverId` (string), `name`, `birthday` (ISO string), `musicalPreference` (`favArtists`, `favGenres`, `eraPreferences`, `blacklistedArtists`), `blacklistedSongs` (string[]), `nowPlayingSong` / `nowPlayingArtist` (written by backend) |
| **patientSecrets** | `{patientId}` (same id as **patients**) | `accessToken`, `refreshToken`, `expiresAt` (Unix seconds) — **Admin SDK only**; clients cannot read or write (see rules). |

OAuth tokens are stored under **patientSecrets** so the patient app never receives Spotify credentials. The Flask backend reads them with the Admin SDK after you complete Spotify login with `?patient_id=` set (see below).

### React Native

1. Copy `.env.example` to `.env` and paste your **Web app** `firebaseConfig` values.
2. The patient app signs in **anonymously** and listens to `patients/{auth.uid}` for `name`, `nowPlayingArtist`, and `nowPlayingSong`.

### Python backend

```bash
cd backend && pip install -r requirements.txt
```

Set **`FIREBASE_SERVICE_ACCOUNT_PATH`** (recommended) or **`GOOGLE_APPLICATION_CREDENTIALS`** to the **absolute path** of a service account JSON file (Firebase Console → Project settings → **Service accounts** → **Generate new private key**). Optionally set **`FIREBASE_PROJECT_ID`** (same value as in the app `.env`). Without this file, `POST /auth/firebase` returns 401 because ID tokens cannot be verified locally.

Environment variables:

- **`FIREBASE_PATIENT_ID`** — Firestore patient document id when testing without the `/login?patient_id=` flow.
- **`CLIENT_ID` / `CLIENT_SECRET`** — used to refresh Spotify tokens stored in **patientSecrets**.

Endpoints:

- **`POST /auth/firebase`** — body `{"idToken": "..."}` or `Authorization: Bearer ...` to store the signed-in Firebase uid in the Flask session (for future caregiver flows).
- **`GET /api/caregiver/patients`** — `Authorization: Bearer <Firebase ID token>` returns the caregiver’s `name`, `age`, `patientIds`, and all **patients** where `caregiverId` equals that uid (profiles only).
- **`/login?patient_id=PATIENT_DOC_ID`** — before Spotify OAuth, binds the callback to that patient: tokens are saved to **patientSecrets** and recommendations use **patients**/`musicalPreference` + **blacklistedSongs**.
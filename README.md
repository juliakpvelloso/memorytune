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
/**
 * Firestore shape: caregivers/{caregiverUid}
 * Patients are listed by id in patientIds; full profile lives under patients/{patientId}.
 */
export type CaregiverProfile = {
  name?: string;
  age?: number;
  patientIds?: string[];
};

/**
 * Firestore: patients/{patientId}
 * patientId is typically the patient device Firebase Auth uid (anonymous).
 * Spotify tokens are NOT stored here — see patientSecrets (Admin SDK only).
 */
export type MusicalPreference = {
  favArtists?: string[];
  favGenres?: string[];
  eraPreferences?: string[];
  blacklistedArtists?: string[];
};

export type PatientProfile = {
  caregiverId?: string;
  name?: string;
  birthday?: string;
  musicalPreference?: MusicalPreference;
  blacklistedSongs?: string[];
  nowPlayingSong?: string | null;
  nowPlayingArtist?: string | null;
};

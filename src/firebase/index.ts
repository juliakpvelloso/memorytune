import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  type Auth,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig, isFirebaseConfigured } from './config';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp | undefined {
  if (!isFirebaseConfigured) {
    return undefined;
  }
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  }
  return app ?? getApps()[0];
}

export function getFirebaseAuth(): Auth | undefined {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return undefined;
  }
  if (!auth) {
    try {
      auth = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
}

export function getFirestoreDb(): Firestore | undefined {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return undefined;
  }
  if (!db) {
    db = getFirestore(firebaseApp);
  }
  return db;
}
export function useAuth(): Auth | undefined {
  const [authInstance, setAuthInstance] = useState<Auth | undefined>();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthInstance(undefined);
      return;
    }

    // First set the auth instance
    setAuthInstance(auth);

    // Listen for auth state changes to trigger re-renders when user logs in/out
    const unsubscribe = onAuthStateChanged(auth, () => {
      // Auth state changed, update the instance to trigger re-render
      setAuthInstance(auth);
    });

    return () => unsubscribe();
  }, []);

  return authInstance;
}

export { isFirebaseConfigured } from './config';

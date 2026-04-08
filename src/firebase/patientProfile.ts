import { doc, onSnapshot } from 'firebase/firestore';
import { getFirestoreDb } from './index';
import type { PatientProfile } from './models';

export function subscribePatientProfile(
  patientId: string,
  onData: (data: PatientProfile | null) => void,
): () => void {
  const firestore = getFirestoreDb();
  if (!firestore) {
    onData(null);
    return () => {};
  }
  const ref = doc(firestore, 'patients', patientId);
  return onSnapshot(
    ref,
    snapshot => {
      onData(snapshot.exists() ? (snapshot.data() as PatientProfile) : null);
    },
    () => onData(null),
  );
}

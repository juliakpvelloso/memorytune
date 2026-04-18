import { doc, onSnapshot } from 'firebase/firestore';
import { getFirestoreDb } from './index';
import type { CaregiverProfile } from './models';

/** Subscribe to `caregivers/{caregiverUid}` (caregiver tooling / future UI). */
export function subscribeCaregiverProfile(
  caregiverId: string,
  onData: (data: CaregiverProfile | null) => void,
): () => void {
  const firestore = getFirestoreDb();
  if (!firestore) {
    onData(null);
    return () => {};
  }
  const ref = doc(firestore, 'caregivers', caregiverId);
  return onSnapshot(
    ref,
    snapshot => {
      onData(snapshot.exists() ? (snapshot.data() as CaregiverProfile) : null);
    },
    () => onData(null),
  );
}

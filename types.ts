export type Screen =
  | 'login'
  | 'patient'
  | 'patientFromCaregiver'
  | 'caregiverDashboard'
  | 'editPatientProfile'
  | 'manageMusic'
  | 'safetySettings'
  | 'listeningInsights';

export type NavigateFn = (screen: Screen) => void;

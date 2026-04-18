export type Screen =
  | 'login'
  | 'patient'
  | 'caregiverDashboard'
  | 'editPatientProfile'
  | 'manageMusic'
  | 'safetySettings'
  | 'listeningInsights';

export type NavigateFn = (screen: Screen) => void;

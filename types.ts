export type Screen =
  | 'patient'
  | 'caregiverDashboard'
  | 'editPatientProfile'
  | 'manageMusic'
  | 'safetySettings'
  | 'listeningInsights';

export type NavigateFn = (screen: Screen) => void;

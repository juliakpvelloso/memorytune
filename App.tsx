import { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/firebase/index';
import type { Screen } from './types';
import LoginScreen from './screens/LoginScreen';
import PatientScreen from './screens/PatientScreen';
import CaregiverDashboard from './screens/CaregiverDashboard';
import EditPatientProfile from './screens/EditPatientProfile';
import ManageMusic from './screens/ManageMusic';
import SafetySettings from './screens/SafetySettings';
import ListeningInsights from './screens/ListeningInsights';

function App() {
<<<<<<< Updated upstream
=======
  const auth = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const navigate = (screen: Screen) => setCurrentScreen(screen);

  // Route based on auth state
  useEffect(() => {
    if (!auth) {
      // Auth still initializing
      return;
    }

    if (auth.currentUser) {
      // User is logged in - route to patient screen
      setCurrentScreen('patientFromCaregiver');
    } else {
      // No user - show login
      setCurrentScreen('login');
    }
  }, [auth?.currentUser]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen navigate={navigate} />;
      case 'patient':
        return <PatientScreen navigate={navigate} fromCaregiver={false} />;
      case 'patientFromCaregiver':
        return <PatientScreen navigate={navigate} fromCaregiver={true} />;
      case 'caregiverDashboard':
        return <CaregiverDashboard navigate={navigate} />;
      case 'editPatientProfile':
        return <EditPatientProfile navigate={navigate} />;
      case 'manageMusic':
        return <ManageMusic navigate={navigate} />;
      case 'safetySettings':
        return <SafetySettings navigate={navigate} />;
      case 'listeningInsights':
        return <ListeningInsights navigate={navigate} />;
      default:
        return <LoginScreen navigate={navigate} />;
    }
  };

>>>>>>> Stashed changes
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF7ED" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [artistLabel, setArtistLabel] = useState('Artist Name');
  const [songLabel, setSongLabel] = useState('Song Title');
  const [patientName, setPatientName] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      // Auth still initializing
      return;
    }

    if (auth.currentUser) {
      // User is logged in - route to patient screen
      setCurrentScreen('patient');
    } else {
      // No user - show login
      setCurrentScreen('login');
    }
  }, [auth?.currentUser]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen navigate={navigate} />;
      case 'patient':
        return <PatientScreen navigate={navigate} fromCaregiver={false} />;
      case 'patientFromCaregiver':
        return <PatientScreen navigate={navigate} fromCaregiver={true} />;
      case 'caregiverDashboard':
        return <CaregiverDashboard navigate={navigate} />;
      case 'editPatientProfile':
        return <EditPatientProfile navigate={navigate} />;
      case 'manageMusic':
        return <ManageMusic navigate={navigate} />;
      case 'safetySettings':
        return <SafetySettings navigate={navigate} />;
      case 'listeningInsights':
        return <ListeningInsights navigate={navigate} />;
      default:
        return <LoginScreen navigate={navigate} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderScreen()}
    </SafeAreaProvider>
  );
}

export default App;

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
  const auth = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const navigate = (screen: Screen) => setCurrentScreen(screen);

  // Route based on auth state
  useEffect(() => {
    if (!auth) {
      // Auth still initializing
      return;
    }

    if (!auth.currentUser) {
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
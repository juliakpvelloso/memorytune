import { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Screen } from './types';
import LoginScreen from './screens/LoginScreen';
import PatientScreen from './screens/PatientScreen';
import CaregiverDashboard from './screens/CaregiverDashboard';
import EditPatientProfile from './screens/EditPatientProfile';
import ManageMusic from './screens/ManageMusic';
import SafetySettings from './screens/SafetySettings';
import ListeningInsights from './screens/ListeningInsights';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const navigate = (screen: Screen) => setCurrentScreen(screen);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen navigate={navigate} />;
      case 'patient':
        return <PatientScreen navigate={navigate} />;
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

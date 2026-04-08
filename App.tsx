import { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './src/firebase';
import { subscribePatientProfile } from './src/firebase/patientProfile';

function App() {
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
    if (!isFirebaseConfigured) {
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    let unsubPatient: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, user => {
      unsubPatient?.();
      unsubPatient = undefined;

      if (!user) {
        signInAnonymously(auth).catch(() => {});
        return;
      }

      unsubPatient = subscribePatientProfile(user.uid, data => {
        setPatientName(data?.name ?? null);
        if (data?.nowPlayingArtist) {
          setArtistLabel(data.nowPlayingArtist);
        }
        if (data?.nowPlayingSong) {
          setSongLabel(data.nowPlayingSong);
        }
      });
    });

    return () => {
      unsubAuth();
      unsubPatient?.();
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: safeAreaInsets.top + 24,
          paddingBottom: safeAreaInsets.bottom + 40,
        },
      ]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('./assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {patientName ? (
          <Text style={styles.patientNameText}>{patientName}</Text>
        ) : null}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.playPauseButton,
          pressed && styles.playPauseButtonPressed,
        ]}
        onPress={() => setIsPlaying(!isPlaying)}>
        <Image
          source={
            isPlaying
              ? require('./assets/pause.png')
              : require('./assets/play_arrow_filled.png')
          }
          style={styles.playPauseIcon}
          resizeMode="contain"
        />
      </Pressable>

      <View style={styles.textBlock}>
        <Text style={styles.artistText}>{artistLabel}</Text>
        <Text style={styles.songText}>{songLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  patientNameText: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#A3A3A3',
  },
  textBlock: {
    alignItems: 'center',
  },
  artistText: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  songText: {
    fontFamily: 'Inter',
    fontSize: 30,
    color: '#111827',
    fontWeight: '600',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.5,
  },
  playPauseButton: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButtonPressed: {
    opacity: 0.8,
  },
  playPauseIcon: {
    width: 96,
    height: 96,
  },
});

export default App;

import { useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import PlaybackMedium from './components/PlaybackMedium';

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
      </View>

      <PlaybackMedium isPlaying={isPlaying} onPress={() => setIsPlaying(!isPlaying)} />

      <View style={styles.textBlock}>
        <Text style={styles.artistText}>Artist Name</Text>
        <Text style={styles.songText}>Song Title</Text>
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
});

export default App;

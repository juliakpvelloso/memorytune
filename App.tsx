import { useState } from 'react';
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

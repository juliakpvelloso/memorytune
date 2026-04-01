import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaybackMedium from '../components/PlaybackMedium';
import type { NavigateFn } from '../types';

const SONGS = [
  { title: 'Beyond the Sea', artist: 'Bobby Darin' },
  { title: 'September', artist: 'Earth, Wind & Fire' },
  { title: 'Everybody Wants To Rule The World', artist: 'Tears For Fears' },
];

// View-based transport icons to match Figma line-icon style

function SkipPrevIcon() {
  return (
    <View style={iconStyles.row}>
      <View style={iconStyles.bar} />
      <View style={iconStyles.triLeft} />
    </View>
  );
}

function PauseIcon() {
  return (
    <View style={iconStyles.row}>
      <View style={iconStyles.pauseBar} />
      <View style={[iconStyles.pauseBar, { marginLeft: 5 }]} />
    </View>
  );
}

function PlayIcon() {
  return <View style={iconStyles.triRight} />;
}

function SkipNextIcon() {
  return (
    <View style={iconStyles.row}>
      <View style={iconStyles.triRight} />
      <View style={[iconStyles.bar, { marginLeft: 2 }]} />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    width: 3,
    height: 22,
    backgroundColor: '#111827',
    borderRadius: 1.5,
    marginRight: 2,
  },
  pauseBar: {
    width: 3.5,
    height: 22,
    backgroundColor: '#111827',
    borderRadius: 1.5,
  },
  triLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderRightWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#111827',
  },
  triRight: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#111827',
  },
});

export default function PatientScreen({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [songIndex, setSongIndex] = useState(0);
  const song = SONGS[songIndex];

  const prev = () => {
    setIsPlaying(false);
    setSongIndex(i => (i - 1 + SONGS.length) % SONGS.length);
  };
  const next = () => {
    setIsPlaying(false);
    setSongIndex(i => (i + 1) % SONGS.length);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerSide}>
          <Pressable
            onPress={() => navigate('caregiverDashboard')}
            style={styles.caregiverBtn}>
            <Text style={styles.caregiverBtnText}>Caregiver</Text>
          </Pressable>
        </View>
      </View>

      {/* Center: CD player */}
      <View style={styles.playerArea}>
        <PlaybackMedium
          isPlaying={isPlaying}
          onPress={() => setIsPlaying(p => !p)}
          size={240}
        />
      </View>

      {/* Song info */}
      <View style={styles.songInfo}>
        <Text style={styles.artistText}>{song.artist}</Text>
        <Text style={styles.songTitle}>{song.title}</Text>
      </View>

      {/* Playback controls */}
      <View style={styles.controls}>
        <Pressable onPress={prev} style={styles.controlBtn} hitSlop={12}>
          <SkipPrevIcon />
        </Pressable>
        <Pressable
          onPress={() => setIsPlaying(p => !p)}
          style={styles.controlBtn}
          hitSlop={12}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Pressable>
        <Pressable onPress={next} style={styles.controlBtn} hitSlop={12}>
          <SkipNextIcon />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  headerSide: {
    width: 90,
    alignItems: 'flex-end',
  },
  logo: {
    width: 54,
    height: 54,
    opacity: 0.45,
  },
  caregiverBtn: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  caregiverBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  playerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songInfo: {
    alignItems: 'center',
    marginBottom: 28,
  },
  artistText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  songTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  controls: {
    flexDirection: 'row',
    gap: 44,
    alignItems: 'center',
  },
  controlBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

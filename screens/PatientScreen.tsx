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

// ── Transport icons ──────────────────────────────────────────────────────────

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
  row: { flexDirection: 'row', alignItems: 'center' },
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

// ── Screen ───────────────────────────────────────────────────────────────────

type Props = {
  navigate: NavigateFn;
  fromCaregiver: boolean;
};

export default function PatientScreen({ navigate, fromCaregiver }: Props) {
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
        {/* Left slot */}
        {fromCaregiver ? (
          <Pressable
            onPress={() => navigate('caregiverDashboard')}
            style={styles.headerSideBtn}
            hitSlop={12}>
            <Text style={styles.backText}>←</Text>
            <Text style={styles.backLabel}>Dashboard</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSide} />
        )}

        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Right slot */}
        {fromCaregiver ? (
          <View style={styles.headerSide} />
        ) : (
          <Pressable
            onPress={() => navigate('login')}
            style={styles.headerSideBtn}
            hitSlop={12}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        )}
      </View>

      {/* CD player */}
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
  },
  headerSideBtn: {
    width: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '300',
  },
  backLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  logoutText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'right',
    width: '100%',
  },
  logo: {
    width: 54,
    height: 54,
    opacity: 0.45,
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

import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaybackMedium from '../components/PlaybackMedium';
import { api } from '../services/api';
import type { NavigateFn } from '../types';

const FALLBACK_SONGS = [
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

type Props = { navigate: NavigateFn; fromCaregiver: boolean };

export default function PatientScreen({ navigate, fromCaregiver }: Props) {
  console.log("PATIENT SCREEN RENDERED");
  const insets = useSafeAreaInsets();

  // Playback state
  const [isPlaying, setIsPlaying]   = useState(false);
  const [song, setSong]             = useState(FALLBACK_SONGS[0].title);
  const [artist, setArtist]         = useState(FALLBACK_SONGS[0].artist);

  // Spotify connection
  const [spotifyConnected, setSpotifyConnected] = useState(api.isAuthenticated());
  const [connecting, setConnecting]             = useState(false);

  // Poll interval ref so we can clear it
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling currently-playing ──────────────────────────────────────────────
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await api.getCurrentlyPlaying();
        if (data.song) {
          setSong(data.song);
          setArtist(data.artist);
          setIsPlaying(data.is_playing ?? false);
        }
      } catch {
        // network error – keep last known state
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (spotifyConnected) startPolling();
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyConnected]);

  // -- Handle Deep Link Redirect from Spotify/Flask --
  useEffect(() => {
    console.log("EFFECT: Deep link listener setting up...");
    const handleUrl = (url: string | null) => {
      
      if (!url) return;

      if (url.includes('memorytune://login-success')) {
        console.log("Deep link received, extracting token...");
      
        // Extract the token from the URL (e.g., memorytune://login-success?token=abc)
        const urlParts = url.split('token=');
        if (urlParts.length > 1) {
          const token = urlParts[1];
          
          // 1. Update the API store directly
          api.setManualToken(token); 
          
          // 2. Update UI state
          setSpotifyConnected(true);
          setConnecting(false);
          
          console.log("Spotify connected successfully via URL token!");
        } else {
          console.warn("Deep link matched but no token found in URL");
          setConnecting(false);
        }
      } else {
        console.warn("Received unrelated deep link:", url);
      }
    };

    // Listen for the app being opened from a background state
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));

    // Check if the app was opened from a cold start via the link
    Linking.getInitialURL().then((url) => handleUrl(url));

    return () => {
      subscription.remove();
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleConnectSpotify = async () => {
    try {
      setConnecting(true);
      const url = api.getLoginUrl();
      await Linking.openURL(url);
    } catch (error) {
      setConnecting(false);
      console.error("Failed to open Spotify login", error);
    }
  };

  const handlePlay = async () => {
    if (!spotifyConnected) { handleConnectSpotify(); return; }
    setIsPlaying(true);
    try { await api.play(); } catch { setIsPlaying(false); }
  };

  const handlePause = async () => {
    if (!spotifyConnected) return;
    setIsPlaying(false);
    try { await api.pause(); } catch { setIsPlaying(true); }
  };

  const handleToggle = () => (isPlaying ? handlePause() : handlePlay());

  const handleSkipNext = async () => {
    if (!spotifyConnected) return;
    try { await api.skipNext(); } catch { /* ignore */ }
  };

  const handleSkipPrev = async () => {
    if (!spotifyConnected) return;
    try { await api.skipPrev(); } catch { /* ignore */ }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
      ]}>

      {/* Header */}
      <View style={styles.header}>
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

        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

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

      {/* Spotify connect banner (shown when not yet connected) */}
      {!spotifyConnected && (
        <Pressable style={styles.connectBanner} onPress={handleConnectSpotify}>
          <Text style={styles.connectBannerText}>
            {connecting ? 'Return to app after connecting…' : '♫  Connect Spotify to play music'}
          </Text>
          {!connecting && <Text style={styles.connectBannerArrow}>→</Text>}
        </Pressable>
      )}

      {/* CD player */}
      <View style={styles.playerArea}>
        <PlaybackMedium
          isPlaying={isPlaying}
          onPress={handleToggle}
          size={240}
        />
      </View>

      {/* Song info */}
      <View style={styles.songInfo}>
        <Text style={styles.artistText}>{artist}</Text>
        <Text style={styles.songTitle}>{song}</Text>
      </View>

      {/* Playback controls */}
      <View style={styles.controls}>
        <Pressable onPress={handleSkipPrev} style={styles.controlBtn} hitSlop={12}>
          <SkipPrevIcon />
        </Pressable>
        <Pressable onPress={handleToggle} style={styles.controlBtn} hitSlop={12}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Pressable>
        <Pressable onPress={handleSkipNext} style={styles.controlBtn} hitSlop={12}>
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
  },
  headerSide: { width: 90 },
  headerSideBtn: {
    width: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: { fontSize: 20, color: '#6B7280', fontWeight: '300' },
  backLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  logoutText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'right',
    width: '100%',
  },
  logo: { width: 54, height: 54, opacity: 0.45 },
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '88%',
  },
  connectBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  connectBannerArrow: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  playerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songInfo: { alignItems: 'center', marginBottom: 28 },
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
  controls: { flexDirection: 'row', gap: 44, alignItems: 'center' },
  controlBtn: { padding: 8, alignItems: 'center', justifyContent: 'center' },
});

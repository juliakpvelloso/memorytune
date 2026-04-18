import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigateFn } from '../types';

export default function ListeningInsights({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigate('caregiverDashboard')}
          style={styles.backBtn}
          hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.title}>Listening Insights</Text>

      {/* Main card */}
      <View style={styles.card}>
        {/* Listened Today */}
        <Text style={styles.cardSectionTitle}>Listened Today</Text>
        <View style={styles.minutesBox}>
          <Text style={styles.minutesNumber}>42</Text>
          <Text style={styles.minutesLabel}>Minutes</Text>
        </View>

        {/* Most Played Song */}
        <Text style={[styles.cardSectionTitle, styles.secondSection]}>Most Played Song</Text>
        <View style={styles.songRow}>
          {/* Album art placeholder */}
          <View style={styles.albumArt}>
            <Text style={styles.albumArtNote}>♫</Text>
          </View>
          <View style={styles.songDetails}>
            <Text style={styles.songTitle}>Beyond the Sea</Text>
            <Text style={styles.songArtist}>Bobby Darin</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 26,
    color: '#111827',
    fontWeight: '300',
  },
  logo: {
    width: 48,
    height: 48,
    opacity: 0.45,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#C8C8C8',
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  cardSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  secondSection: {
    marginTop: 8,
  },
  minutesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 28,
    alignItems: 'center',
  },
  minutesNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 80,
  },
  minutesLabel: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
    marginTop: 2,
  },
  songRow: {
    backgroundColor: '#DCDCDC',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  albumArt: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#A8B4BC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArtNote: {
    fontSize: 28,
    color: '#5A6A72',
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  songArtist: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

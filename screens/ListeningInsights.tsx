import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type ListeningInsights as ListeningInsightsData } from '../services/api';
import type { NavigateFn } from '../types';

export default function ListeningInsights({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<ListeningInsightsData | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getListeningInsights(period)
      .then(data => setInsights(data))
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, [period]);

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

      <View style={styles.periodRow}>
        {(['day', 'week', 'month', 'year'] as const).map(value => (
          <Pressable
            key={value}
            onPress={() => setPeriod(value)}
            style={[styles.periodPill, period === value && styles.periodPillActive]}>
            <Text style={[styles.periodPillText, period === value && styles.periodPillTextActive]}>
              {value === 'day'
                ? 'Today'
                : value === 'week'
                  ? 'This Week'
                  : value === 'month'
                    ? 'This Month'
                    : 'This Year'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Main card */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>
          {insights?.patient?.name ? `Patient: ${insights.patient.name}` : 'Patient insights'}
        </Text>

        {/* Listened Today */}
        <Text style={styles.cardSectionTitle}>
          {period === 'day' ? 'Listened Today' : `Minutes (${period})`}
        </Text>
        <View style={styles.minutesBox}>
          {loading ? (
            <ActivityIndicator size="large" color="#111827" />
          ) : (
            <Text style={styles.minutesNumber}>{insights?.minutes_listened ?? 0}</Text>
          )}
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
            <Text style={styles.songTitle}>{insights?.top_song?.song || 'No song data'}</Text>
            <Text style={styles.songArtist}>{insights?.top_song?.artist || '—'}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <MetaSection label="Top Artists" value={(insights?.top_artists || []).join(', ') || '—'} />
          <MetaSection label="Top Genres" value={(insights?.top_genres || []).join(', ') || '—'} />
          <MetaSection
            label="Era Preferences"
            value={(insights?.era_preferences || []).join(', ') || '—'}
          />
          <MetaSection
            label="Blacklist"
            value={
              insights
                ? `${insights.blacklist.songs_count} songs, ${insights.blacklist.artists_count} artists`
                : '—'
            }
          />
        </View>
      </View>
    </View>
  );
}

function MetaSection({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaSection}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
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
    textAlign: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  periodPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  periodPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  periodPillTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#C8C8C8',
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  subtitle: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '600',
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
  metaGrid: {
    gap: 10,
    marginTop: 4,
  },
  metaSection: {
    backgroundColor: '#ECECEC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  metaLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
});

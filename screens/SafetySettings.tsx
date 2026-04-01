import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigateFn } from '../types';

const BLOCKED_SONGS = [
  'My Way by Fetty Wap',
  'Unforgettable by French Montana',
  '2024 by Playboi Carti',
];

const BLOCKED_ARTISTS = ['Elvis Presley', 'Yeat', 'Destroy Lonely'];

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map(item => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function AddButton({ label }: { label: string }) {
  return (
    <Pressable style={styles.addBtn}>
      <Text style={styles.addBtnPencil}>✎</Text>
      <Text style={styles.addBtnText}>{label}</Text>
    </Pressable>
  );
}

type PreferenceRowProps = {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  divider?: boolean;
};

function PreferenceRow({ label, value, onToggle, divider }: PreferenceRowProps) {
  return (
    <>
      <View style={styles.prefRow}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#D1D5DB', true: '#374151' }}
          thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
      {divider && <View style={styles.prefDivider} />}
    </>
  );
}

export default function SafetySettings({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();
  const [continuous, setContinuous] = useState(true);
  const [gentle, setGentle] = useState(true);
  const [noExplicit, setNoExplicit] = useState(true);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}>
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

      <Text style={styles.title}>Safety Settings</Text>

      {/* Blocked Songs */}
      <Text style={styles.sectionTitle}>Blocked Songs</Text>
      <BulletList items={BLOCKED_SONGS} />
      <AddButton label="Add More Songs" />

      {/* Blocked Artists */}
      <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>Blocked Artists</Text>
      <BulletList items={BLOCKED_ARTISTS} />
      <AddButton label="Add More Artists" />

      {/* Playback Preferences */}
      <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>Playback Preferences</Text>
      <View style={styles.prefsCard}>
        <PreferenceRow
          label="Continuous Playback"
          value={continuous}
          onToggle={setContinuous}
          divider
        />
        <PreferenceRow
          label="Gentle Transitions"
          value={gentle}
          onToggle={setGentle}
          divider
        />
        <PreferenceRow
          label="Avoid Explicit Lyrics"
          value={noExplicit}
          onToggle={setNoExplicit}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  sectionMarginTop: {
    marginTop: 28,
  },
  bulletList: {
    marginBottom: 14,
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bullet: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 22,
  },
  bulletText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 22,
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  addBtnPencil: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  prefsCard: {
    backgroundColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  prefLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  prefDivider: {
    height: 1,
    backgroundColor: '#B8BEC7',
  },
});

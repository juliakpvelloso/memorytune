import { useState } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigateFn } from '../types';

const ERAS = ['1950s', '1960s', '1970s', '1980s', 'Other'];

const ARTISTS = [
  { name: 'Bobby Darin', initials: 'BD', bg: '#7C8FA0' },
  { name: 'Earth, Wind, Fire', initials: 'EW', bg: '#8C7A6B' },
  { name: 'Marvin Gaye', initials: 'MG', bg: '#6B7A5C' },
];

const GENRES = [
  { name: 'Jazz', bg: '#5B3A8C' },
  { name: 'Classical', bg: '#7A4A1E' },
  { name: 'Soul', bg: '#C07020' },
];

function SubsectionCard({
  items,
  editLabel,
  renderItem,
}: {
  items: { name: string }[];
  editLabel: string;
  renderItem: (item: { name: string }) => ReactNode;
}) {
  return (
    <View style={styles.subsectionCard}>
      <View style={styles.circleRow}>
        {items.map(item => (
          <View key={item.name} style={styles.circleItem}>
            {renderItem(item)}
            <Text style={styles.circleLabel}>{item.name}</Text>
          </View>
        ))}
      </View>
      <Pressable style={styles.editBtn}>
        <Text style={styles.editBtnPencil}>✎</Text>
        <Text style={styles.editBtnText}>{editLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function ManageMusic({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();
  const [selectedEras, setSelectedEras] = useState<string[]>(['1960s', '1970s']);

  const toggleEra = (era: string) => {
    setSelectedEras(prev =>
      prev.includes(era) ? prev.filter(e => e !== era) : [...prev, era],
    );
  };

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

      <Text style={styles.title}>Manage Music</Text>

      {/* Era Preferences */}
      <Text style={styles.sectionTitle}>Music Era Preferences</Text>
      <View style={styles.eraGrid}>
        {ERAS.map(era => {
          const selected = selectedEras.includes(era);
          return (
            <Pressable
              key={era}
              onPress={() => toggleEra(era)}
              style={[styles.eraPill, selected && styles.eraPillSelected]}>
              <Text style={[styles.eraPillText, selected && styles.eraPillTextSelected]}>
                {era}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Favorite Artists */}
      <Text style={styles.sectionTitle}>Favorite Artists</Text>
      <SubsectionCard
        items={ARTISTS}
        editLabel="Edit Artists"
        renderItem={item => {
          const a = item as (typeof ARTISTS)[0];
          return (
            <View style={[styles.artistCircle, { backgroundColor: a.bg }]}>
              <Text style={styles.circleInitials}>{a.initials}</Text>
            </View>
          );
        }}
      />

      {/* Genres */}
      <Text style={styles.sectionTitle}>Genres</Text>
      <SubsectionCard
        items={GENRES}
        editLabel="Edit Genres"
        renderItem={item => {
          const g = item as (typeof GENRES)[0];
          return (
            <View style={[styles.genreCircle, { backgroundColor: g.bg }]}>
              <Text style={styles.genreInitial}>{g.name[0]}</Text>
            </View>
          );
        }}
      />
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
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
    textAlign: 'center',
  },
  eraGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  eraPill: {
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  eraPillSelected: {
    backgroundColor: '#4B5563',
  },
  eraPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  eraPillTextSelected: {
    color: '#FFFFFF',
  },
  subsectionCard: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 28,
    gap: 16,
  },
  circleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  circleItem: {
    alignItems: 'center',
    gap: 6,
    maxWidth: 80,
  },
  artistCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  genreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreInitial: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  circleLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 11,
  },
  editBtnPencil: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

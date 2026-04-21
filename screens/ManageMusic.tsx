import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { NavigateFn } from '../types';

const STATIC_ERAS = ['1950s', '1960s', '1970s', '1980s'];

function SubsectionCard({
  items,
  editLabel,
  renderItem,
  onEdit,
  onRemove,
  placeholderType,
}: {
  items: { name: string }[];
  editLabel: string;
  renderItem: (item: { name: string }) => ReactNode;
  onEdit?: () => void;
  onRemove: (name: string) => void;
  placeholderType: string;
}) {
  const hasItems = items.length > 0;

  return (
    <View style={styles.subsectionCard}>
      {hasItems ? (
        <View style={styles.circleRow}>
          {items.map(item => (
            <View key={item.name} style={styles.circleItem}>
              <Pressable 
                style={styles.removeBadge} 
                onPress={() => onRemove(item.name)}
                hitSlop={10}
              >
                <Text style={styles.removeBadgeText}>×</Text>
              </Pressable>
              
              {renderItem(item)}
              <Text style={styles.circleLabel} numberOfLines={1}>{item.name}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          no user preferences set, add {placeholderType}
        </Text>
      )}

      <Pressable style={styles.editBtn} onPress={onEdit}>
        <Text style={styles.editBtnText}>{editLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function ManageMusic({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();

  const [selectedEras, setSelectedEras] = useState<string[]>([]);
  // Store eras that aren't in the STATIC_ERAS list
  const [customEras, setCustomEras] = useState<string[]>([]);
  const [artists, setArtists] = useState<{name: string, initials?: string, bg: string}[]>([]);
  const [genres, setGenres]   = useState<{name: string, bg: string}[]>([]);
  const [saving, setSaving]   = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'artists' | 'genres' | 'eras'>('artists');
  const [inputValue, setInputValue] = useState('');

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const ARTIST_COLORS = ['#7C8FA0', '#8C7A6B', '#6B7A5C', '#5B3A8C', '#7A4A1E'];
  const GENRE_COLORS  = ['#5B3A8C', '#7A4A1E', '#C07020', '#2D6A4F', '#1D3557'];

  useEffect(() => {
    api.getUserProfile()
      .then(profile => {
        if (profile.era_preferences?.length) {
          setSelectedEras(profile.era_preferences);
          // Identify which eras in the profile are "custom" (not in our static list)
          const custom = profile.era_preferences.filter((e: string) => !STATIC_ERAS.includes(e));
          setCustomEras(custom);
        }
        if (profile.fav_artists?.length) {
          setArtists(profile.fav_artists.map((name: string, i: number) => ({
            name,
            initials: getInitials(name),
            bg: ARTIST_COLORS[i % ARTIST_COLORS.length],
          })));
        }
        if (profile.fav_genres?.length) {
          setGenres(profile.fav_genres.map((name: string, i: number) => ({
            name,
            bg: GENRE_COLORS[i % GENRE_COLORS.length],
          })));
        }
      })
      .catch(() => {});
  }, []);

  const saveToApi = async (key: string, data: string[]) => {
    setSaving(true);
    try { 
      await api.updateUserProfile({ [key]: data }); 
    } catch (e) {
      Alert.alert("Error", "Failed to save preferences");
    }
    setSaving(false);
  };

  const handleAddItem = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    if (modalType === 'eras') {
      const updatedEras = [...selectedEras, trimmedValue];
      setSelectedEras(updatedEras);
      setCustomEras(prev => [...prev, trimmedValue]);
      saveToApi('era_preferences', updatedEras);
    } else if (modalType === 'artists') {
      const newArtist = {
        name: trimmedValue,
        initials: getInitials(trimmedValue),
        bg: ARTIST_COLORS[artists.length % ARTIST_COLORS.length]
      };
      const updated = [...artists, newArtist];
      setArtists(updated);
      saveToApi('fav_artists', updated.map(a => a.name));
    } else {
      const newGenre = {
        name: trimmedValue,
        bg: GENRE_COLORS[genres.length % GENRE_COLORS.length]
      };
      const updated = [...genres, newGenre];
      setGenres(updated);
      saveToApi('fav_genres', updated.map(g => g.name));
    }

    setInputValue('');
    setIsModalOpen(false);
  };

  const toggleEra = async (era: string) => {
    if (era === 'Other') {
      setModalType('eras');
      setIsModalOpen(true);
      return;
    }

    const updated = selectedEras.includes(era)
      ? selectedEras.filter(e => e !== era)
      : [...selectedEras, era];
    
    setSelectedEras(updated);
    saveToApi('era_preferences', updated);
  };

  const handleRemoveItem = (name: string, type: 'artists' | 'genres') => {
    if (type === 'artists') {
      const updated = artists.filter(a => a.name !== name);
      setArtists(updated);
      saveToApi('fav_artists', updated.map(a => a.name));
    } else {
      const updated = genres.filter(g => g.name !== name);
      setGenres(updated);
      saveToApi('fav_genres', updated.map(g => g.name));
    }
  };

  // Combine static list, any custom ones added, and the "Other" button
  const displayEras = [...STATIC_ERAS, ...customEras, 'Other'];

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigate('caregiverDashboard')} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.title}>Manage Music</Text>
        {saving && <Text style={styles.savingBadge}>Saving…</Text>}

        <Text style={styles.sectionTitle}>Music Era Preferences</Text>
        <View style={styles.eraGrid}>
          {displayEras.map(era => {
            const isSelected = selectedEras.includes(era);
            const isOther = era === 'Other';
            return (
              <Pressable
                key={era}
                onPress={() => toggleEra(era)}
                style={[
                  styles.eraPill, 
                  isSelected && styles.eraPillSelected,
                  isOther && { borderStyle: 'dashed', borderWidth: 1, borderColor: '#9CA3AF' }
                ]}>
                <Text style={[styles.eraPillText, isSelected && styles.eraPillTextSelected]}>
                  {era}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ... Artists and Genres SubsectionCards remain the same as your provided code ... */}
        <Text style={styles.sectionTitle}>Favorite Artists</Text>
        <SubsectionCard
            items={artists}
            placeholderType="artists"
            editLabel="Edit Artists"
            onEdit={() => { setModalType('artists'); setIsModalOpen(true); }}
            onRemove={(name) => handleRemoveItem(name, 'artists')}
            renderItem={item => (
                <View style={[styles.artistCircle, { backgroundColor: item.bg }]}>
                    <Text style={styles.circleInitials}>{item.initials ?? item.name[0]}</Text>
                </View>
            )}
        />

        <Text style={styles.sectionTitle}> Favorite Genres</Text>
        <SubsectionCard
            items={genres}
            placeholderType="genres"
            editLabel="Add Genre"
            onEdit={() => { setModalType('genres'); setIsModalOpen(true); }}
            onRemove={(name) => handleRemoveItem(name, 'genres')}
            renderItem={item => (
                <View style={[styles.genreCircle, { backgroundColor: item.bg }]}>
                    <Text style={styles.genreInitial}>{item.name[0]}</Text>
                </View>
            )}
        />
      </ScrollView>

      <Modal visible={isModalOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
                Add {modalType === 'artists' ? 'Artist' : modalType === 'genres' ? 'Genre' : 'Era'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter ${modalType.replace('s', '')} name...`}
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setIsModalOpen(false); setInputValue(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleAddItem}>
                <Text style={styles.saveBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: '#FFFFFF' },
  container: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: '#111827', fontWeight: '300' },
  logo:     { width: 48, height: 48, opacity: 0.45 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#111827',
    marginBottom: 20, textAlign: 'center',
  },
  savingBadge: {
    textAlign: 'right', fontSize: 12, color: '#9CA3AF', marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#111827',
    marginBottom: 14, textAlign: 'center',
  },
  eraGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 10, marginBottom: 28,
  },
  eraPill: {
    paddingHorizontal: 26, paddingVertical: 13,
    borderRadius: 999, backgroundColor: '#E5E7EB',
  },
  eraPillSelected: { backgroundColor: '#4B5563' },
  eraPillText:     { fontSize: 15, fontWeight: '600', color: '#374151' },
  eraPillTextSelected: { color: '#FFFFFF' },
  subsectionCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 18, alignItems: 'center',
    marginBottom: 28, gap: 16,
  },
  circleRow:     { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  circleItem:    { alignItems: 'center', gap: 6, maxWidth: 80 },
  artistCircle:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  circleInitials:{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  genreCircle:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  genreInitial:  { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  circleLabel:   { fontSize: 12, color: '#374151', fontWeight: '500', textAlign: 'center' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111827',
    borderRadius: 999, paddingHorizontal: 28, paddingVertical: 11,
  },
  editBtnPencil: { color: '#FFFFFF', fontSize: 14 },
  editBtnText:   { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, gap: 16
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  input: {
    backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#E5E7EB'
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#111827' },
  cancelBtnText: { color: '#4B5563', fontWeight: '600' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600' },
  circleItem: { 
    alignItems: 'center', 
    gap: 6, 
    maxWidth: 80,
    position: 'relative', // Critical for absolute positioning of the X
  },
  removeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it stays on top of the circle
  },
  removeBadgeText: {
    color: '#0f0f10',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
    marginVertical: 10,
  }
});

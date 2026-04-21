import { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { NavigateFn } from '../types';

type PlaybackPrefs = {
  continuous_playback: boolean;
  gentle_transition: boolean;
  allow_explicit: boolean;
};

function PreferenceRow({
  label,
  value,
  onToggle,
  divider,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  divider?: boolean;
}) {
  return (
    <>
      <View style={styles.prefRow}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#D1D5DB', true: '#374151' }}
          thumbColor="#FFFFFF"
        />
      </View>
      {divider && <View style={styles.prefDivider} />}
    </>
  );
}

function BlockList({
  items,
  onRemove,
}: {
  items: string[];
  onRemove: (item: string) => void;
}) {
  return (
    <View style={styles.bulletList}>
      {items.map(item => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
          <Pressable onPress={() => onRemove(item)} hitSlop={8}>
            <Text style={styles.removeX}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function InlineAdd({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    setValue('');
    setOpen(false);
  };

  if (open) {
    return (
      <View style={styles.inlineAddWrap}>
        <TextInput
          ref={inputRef}
          style={styles.inlineInput}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={commit}
          blurOnSubmit={false}
        />
        <View style={styles.inlineAddBtns}>
          <Pressable style={styles.addConfirmBtn} onPress={commit}>
            <Text style={styles.addConfirmText}>Add</Text>
          </Pressable>
          <Pressable style={styles.addCancelBtn} onPress={() => { setValue(''); setOpen(false); }}>
            <Text style={styles.addCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.addBtn} onPress={() => setOpen(true)}>
      <Text style={styles.addBtnText}>{label}</Text>
    </Pressable>
  );
}

export default function SafetySettings({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();

  const [blockedSongs,   setBlockedSongs]   = useState<string[]>([]);
  const [blockedArtists, setBlockedArtists] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<PlaybackPrefs>({
    continuous_playback: false,
    gentle_transition:   false,
    allow_explicit:      true,
  });

  // Load from backend on mount
  useEffect(() => {
    api.getUserProfile()
      .then(p => {
        if (p.blocked_songs?.length)   setBlockedSongs(p.blocked_songs);
        if (p.blocked_artists?.length) setBlockedArtists(p.blocked_artists);
        if (p.playback_preferences)    setPrefs(p.playback_preferences as PlaybackPrefs);
      })
      .catch(() => { /* server not running – keep defaults */ });
  }, []);

  // Persist helpers
  const saveSongs = async (list: string[]) => {
    try { await api.updateUserProfile({ blocked_songs: list }); } catch { /* ignore */ }
  };
  const saveArtists = async (list: string[]) => {
    try { await api.updateUserProfile({ blocked_artists: list }); } catch { /* ignore */ }
  };
  const savePrefs = async (updated: PlaybackPrefs) => {
    try { await api.updateUserProfile({ playback_preferences: updated }); } catch { /* ignore */ }
  };

  const removeSong = (song: string) => {
    const updated = blockedSongs.filter(s => s !== song);
    setBlockedSongs(updated);
    saveSongs(updated);
  };
  const addSong = (song: string) => {
    const updated = [...blockedSongs, song];
    setBlockedSongs(updated);
    saveSongs(updated);
  };
  const removeArtist = (artist: string) => {
    const updated = blockedArtists.filter(a => a !== artist);
    setBlockedArtists(updated);
    saveArtists(updated);
  };
  const addArtist = (artist: string) => {
    const updated = [...blockedArtists, artist];
    setBlockedArtists(updated);
    saveArtists(updated);
  };
  const togglePref = (key: keyof PlaybackPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    savePrefs(updated);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Pressable
            onPress={() => navigate('caregiverDashboard')}
            style={styles.backBtn}
            hitSlop={12}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.title}>Safety Settings</Text>

        {/* Blocked Songs */}
        <Text style={styles.sectionTitle}>Blocked Songs</Text>
        <View style={styles.listCard}>
          {blockedSongs.length > 0 ? (
            <BlockList items={blockedSongs} onRemove={removeSong} />
          ) : (
          <Text style={styles.emptyText}>No blocked songs</Text>
          )}
          <View style={styles.listDivider} />
          <InlineAdd label="Add More Songs" placeholder="Example: Bohemian Rhapsody by Queen" onAdd={addSong} />
        </View>

        {/* Blocked Artists */}
        <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>Blocked Artists</Text>
        <View style={styles.listCard}>
          {blockedArtists.length > 0 ? (
            <BlockList items={blockedArtists} onRemove={removeArtist} />
          ) : (
            <Text style={styles.emptyText}>No blocked artists</Text>
        )}
          <View style={styles.listDivider} />
          <InlineAdd label="Add More Artists" placeholder="Example: Elvis Presley" onAdd={addArtist} />
        </View>

        {/* Playback Preferences */}
        <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>Playback Preferences</Text>
        <View style={styles.prefsCard}>
          <PreferenceRow
            label="Continuous Playback"
            value={prefs.continuous_playback}
            onToggle={() => togglePref('continuous_playback')}
            divider
          />
          <PreferenceRow
            label="Gentle Transitions"
            value={prefs.gentle_transition}
            onToggle={() => togglePref('gentle_transition')}
            divider
          />
          <PreferenceRow
            label="Avoid Explicit Lyrics"
            value={!prefs.allow_explicit}
            onToggle={() => togglePref('allow_explicit')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  title:    { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 10 },
  sectionMarginTop: { marginTop: 28 },
  listCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16,
  },
  bulletList: { gap: 8, marginBottom: 4 },
  bulletRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bullet:     { fontSize: 16, color: '#6B7280', lineHeight: 22 },
  bulletText: { fontSize: 15, color: '#111827', lineHeight: 22, flex: 1, fontWeight: '500' },
  removeX:    { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  listDivider:{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  inlineAddWrap: { gap: 10 },
  inlineInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#111827',
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#111827',
  },
  inlineAddBtns:  { flexDirection: 'row', gap: 10 },
  addConfirmBtn:  { flex: 1, backgroundColor: '#111827', borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  addConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  addCancelBtn:   { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB' },
  addCancelText:  { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#111827', borderRadius: 999, paddingVertical: 12,
  },
  addBtnIcon: { color: '#FFFFFF', fontSize: 14 },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  prefsCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 18, paddingVertical: 4,
  },
  prefRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  prefLabel:  { fontSize: 16, color: '#111827', fontWeight: '500' },
  prefDivider:{ height: 1, backgroundColor: '#E5E7EB' },
});

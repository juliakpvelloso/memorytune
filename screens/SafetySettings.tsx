import { useRef, useState } from 'react';
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
import type { NavigateFn } from '../types';

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
          thumbColor="#FFFFFF"
        />
      </View>
      {divider && <View style={styles.prefDivider} />}
    </>
  );
}

type BlockListProps = {
  items: string[];
  onRemove: (item: string) => void;
};

function BlockList({ items, onRemove }: BlockListProps) {
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

type InlineAddProps = {
  label: string;
  placeholder: string;
  onAdd: (value: string) => void;
};

function InlineAdd({ label, placeholder, onAdd }: InlineAddProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
    }
    setValue('');
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
    // autoFocus on TextInput handles keyboard
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
    <Pressable style={styles.addBtn} onPress={handleOpen}>
      <Text style={styles.addBtnIcon}>✏</Text>
      <Text style={styles.addBtnText}>{label}</Text>
    </Pressable>
  );
}

export default function SafetySettings({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();

  const [blockedSongs, setBlockedSongs] = useState([
    'My Way by Fetty Wap',
    'Unforgettable by French Montana',
    '2024 by Playboi Carti',
  ]);
  const [blockedArtists, setBlockedArtists] = useState([
    'Elvis Presley',
    'Yeat',
    'Destroy Lonely',
  ]);
  const [continuous, setContinuous] = useState(true);
  const [gentle, setGentle] = useState(true);
  const [noExplicit, setNoExplicit] = useState(true);

  const removeSong = (song: string) =>
    setBlockedSongs(prev => prev.filter(s => s !== song));
  const removeArtist = (artist: string) =>
    setBlockedArtists(prev => prev.filter(a => a !== artist));

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
        <View style={styles.listCard}>
          <BlockList items={blockedSongs} onRemove={removeSong} />
          <View style={styles.listDivider} />
          <InlineAdd
            label="Add More Songs"
            placeholder="Song name by artist…"
            onAdd={song => setBlockedSongs(prev => [...prev, song])}
          />
        </View>

        {/* Blocked Artists */}
        <Text style={[styles.sectionTitle, styles.sectionMarginTop]}>Blocked Artists</Text>
        <View style={styles.listCard}>
          <BlockList items={blockedArtists} onRemove={removeArtist} />
          <View style={styles.listDivider} />
          <InlineAdd
            label="Add More Artists"
            placeholder="Artist name…"
            onAdd={artist => setBlockedArtists(prev => [...prev, artist])}
          />
        </View>

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
    </KeyboardAvoidingView>
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

  // Blocked list card
  listCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 0,
  },
  bulletList: {
    gap: 8,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bullet: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  bulletText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    flex: 1,
    fontWeight: '500',
  },
  removeX: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },

  // Inline add
  inlineAddWrap: {
    gap: 10,
  },
  inlineInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  inlineAddBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  addConfirmBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addCancelBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  addCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 12,
  },
  addBtnIcon: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Prefs card
  prefsCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#E5E7EB',
  },
});

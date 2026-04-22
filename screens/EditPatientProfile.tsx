import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { NavigateFn } from '../types';

const STATIC_ERAS = ['1950s', '1960s', '1970s', '1980s'];

const canonicalizeEra = (value: unknown): string => {
  const raw = String(value ?? '');
  const trimmed = raw.trim().replace(/[’']/g, '').toLowerCase();
  const decadeMatch = trimmed.match(/^(\d{4})s?$/);
  if (decadeMatch) {
    return `${decadeMatch[1]}s`;
  }
  return trimmed;
};

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={headerS.row}>
      <Pressable onPress={onBack} style={headerS.backBtn} hitSlop={12}>
        <Text style={headerS.backText}>←</Text>
      </Pressable>
      <Image source={require('../assets/logo.png')} style={headerS.logo} resizeMode="contain" />
      <View style={headerS.spacer} />
    </View>
  );
}

const headerS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: '#111827', fontWeight: '300' },
  logo: { width: 48, height: 48, opacity: 0.45 },
  spacer: { width: 40 },
});

export default function EditPatientProfile({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();

  // Profile States
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  
  // Era States
  const [selectedEras, setSelectedEras] = useState<string[]>([]);
  const [customEras, setCustomEras] = useState<string[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // UI States
  const [editingName, setEditingName] = useState(false);
  const [editingYear, setEditingYear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activePatientReady, setActivePatientReady] = useState(false);

  const normalizeEras = (eras: unknown[]) => {
    const normalized = eras
      .map(e => String(e ?? '').trim())
      .filter(Boolean)
      .map(canonicalizeEra);
    return Array.from(new Set(normalized));
  };

  const ensureActivePatient = async () => {
    const data = await api.getCaregiverPatients();
    const first = data.patients?.[0];
    if (first?._id) {
      await api.selectPatient(first._id);
      setActivePatientReady(true);
      return;
    }
    const created = await api.createPatient({
      name: 'New Patient',
      birth_year: '',
      era_preferences: [],
      blocked_songs: [],
      blocked_artists: [],
      fav_artists: [],
      fav_genres: [],
    });
    if (created.ok && created.patient_id) {
      await api.selectPatient(created.patient_id);
      setActivePatientReady(true);
    }
  };

  useEffect(() => {
    ensureActivePatient()
      .then(() => api.getUserProfile())
      .then(p => {
        setName(p.name);
        setBirthYear(p.birth_year);
        if (p.profile_image) setProfileImage(p.profile_image);
        const persistedEras = normalizeEras([
          ...(Array.isArray(p.era_preferences) ? p.era_preferences : []),
          ...(p.era ? [p.era] : []),
        ]);
        if (persistedEras.length) {
          setSelectedEras(persistedEras);
          const custom = persistedEras.filter(
            (e: string) => !STATIC_ERAS.map(canonicalizeEra).includes(canonicalizeEra(e)),
          );
          setCustomEras(custom);
        }
      })
      .catch(() => { /* keep defaults if server off */ });
  }, []);

  const syncProfile = async (data: any) => {
    if (!activePatientReady) {
      try {
        await ensureActivePatient();
      } catch {
        return;
      }
    }
    setSaving(true);
    try { await api.updateUserProfile(data); } catch { /* ignore */ }
    setSaving(false);
  };

  const saveName = () => { setEditingName(false); syncProfile({ name }); };
  const saveYear = () => { setEditingYear(false); syncProfile({ birth_year: birthYear }); };

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    if (result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri ?? null;
      setProfileImage(uri);
      if (uri) syncProfile({ profile_image: uri });
    }
  };

  const toggleEra = (eraName: string) => {
    if (eraName === 'Other') {
      setIsAddingCustom(true);
      return;
    }
    const canonicalEra = canonicalizeEra(eraName);
    const next = selectedEras.map(canonicalizeEra).includes(canonicalEra)
      ? selectedEras.filter(e => canonicalizeEra(e) !== canonicalEra)
      : [...selectedEras, canonicalEra];
    const normalized = normalizeEras(next);
    setSelectedEras(normalized);
    syncProfile({ era_preferences: normalized });
  };

  const addCustomEra = () => {
    if (customInput.trim()) {
      const newEra = customInput.trim();
      const next = normalizeEras([...selectedEras, newEra]);
      setCustomEras(prev => normalizeEras([...prev, newEra]));
      setSelectedEras(next);
      syncProfile({ era_preferences: next });
      setCustomInput('');
      setIsAddingCustom(false);
    }
  };

  const displayEras = [...STATIC_ERAS, ...customEras, 'Other'];

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
        keyboardShouldPersistTaps="handled">

        <ScreenHeader onBack={() => navigate('caregiverDashboard')} />
        <Text style={styles.title}>Edit Patient Profile</Text>

        {saving && <Text style={styles.savingBadge}>Saving…</Text>}

        <View style={styles.card}>
          {/* Photo Section */}
          <View style={styles.photoContainer}>
            <Pressable onPress={pickImage}>
              <View style={styles.photoCircle}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.fullImage} />
                ) : (
                  <View style={styles.placeholderGroup}>
                    <View style={styles.photoHead} />
                    <View style={styles.photoShoulders} />
                  </View>
                )}
              </View>
              <View style={styles.cameraBadge}>
                <Text style={styles.cameraIconText}>📷</Text>
              </View>
            </Pressable>
          </View>

          {/* Name Field */}
          {editingName ? (
            <TextInput style={styles.nameInput} value={name} onChangeText={setName} autoFocus onSubmitEditing={saveName} />
          ) : (
            <Text style={styles.patientName}>{name}</Text>
          )}
          <Pressable style={editingName ? styles.saveBtn : styles.editBtn} onPress={editingName ? saveName : () => setEditingName(true)}>
            <Text style={editingName ? styles.saveBtnText : styles.editBtnText}>{editingName ? 'Save' : 'Edit Name'}</Text>
          </Pressable>

          <View style={styles.divider} />

          {/* Birth Year Field */}
          {editingYear ? (
            <TextInput style={styles.yearInput} value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" autoFocus onSubmitEditing={saveYear} maxLength={4} />
          ) : (
            <Text style={styles.bigNumber}>{birthYear}</Text>
          )}
          <Text style={styles.fieldLabel}>Birth Year</Text>
          <Pressable style={editingYear ? styles.saveBtn : styles.editBtn} onPress={editingYear ? saveYear : () => setEditingYear(true)}>
            <Text style={editingYear ? styles.saveBtnText : styles.editBtnText}>{editingYear ? 'Save' : 'Edit Year'}</Text>
          </Pressable>

          <View style={styles.divider} />

          {/* Era Section */}
          <Text style={styles.sectionLabel}>Memory Eras</Text>
          {isAddingCustom ? (
            <View style={styles.customInputRow}>
              <TextInput style={styles.customInput} placeholder="e.g. 1940s" value={customInput} onChangeText={setCustomInput} autoFocus onSubmitEditing={addCustomEra} />
              <Pressable style={styles.addBtn} onPress={addCustomEra}><Text style={styles.addBtnText}>Add</Text></Pressable>
              <Pressable onPress={() => setIsAddingCustom(false)}><Text style={styles.cancelText}>✕</Text></Pressable>
            </View>
          ) : (
            <View style={styles.eraPickerWrap}>
              {displayEras.map(era => {
                const isSelected = selectedEras
                  .map(canonicalizeEra)
                  .includes(canonicalizeEra(era));
                return (
                  <Pressable key={era} onPress={() => toggleEra(era)} style={[styles.eraPill, isSelected && styles.eraPillSelected, era === 'Other' && styles.otherPill]}>
                    <Text style={[styles.eraPillText, isSelected && styles.eraPillTextSelected]}>{era}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 20, textAlign: 'center' },
  savingBadge: { alignSelf: 'flex-end', fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  card: { backgroundColor: '#F3F4F6', borderRadius: 24, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 28, gap: 14 },
  
  // Photo Styles
  photoContainer: { width: 100, height: 100, marginBottom: 10, position: 'relative' },
  photoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#D1D5DB', borderWidth: 3, borderColor: '#FFFFFF', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%' },
  placeholderGroup: { alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%' },
  photoHead: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', opacity: 0.7, position: 'absolute', top: 16 },
  photoShoulders: { width: 70, height: 40, borderTopLeftRadius: 35, borderTopRightRadius: 35, backgroundColor: '#FFFFFF', opacity: 0.5 },
  cameraBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F3F4F6', elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2 },
  cameraIconText: { fontSize: 18 },

  // Input Styles
  patientName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  nameInput: { fontSize: 20, fontWeight: '700', color: '#111827', borderBottomWidth: 2, borderBottomColor: '#111827', textAlign: 'center', minWidth: 200 },
  bigNumber: { fontSize: 60, fontWeight: '800', color: '#111827' },
  yearInput: { fontSize: 60, fontWeight: '800', color: '#111827', borderBottomWidth: 2, borderBottomColor: '#111827', textAlign: 'center', minWidth: 140 },
  fieldLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginTop: -8 },
  divider: { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },

  // Era Selection
  sectionLabel: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  eraPickerWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%' },
  eraPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D1D5DB' },
  eraPillSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  eraPillText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  eraPillTextSelected: { color: '#FFFFFF' },
  otherPill: { borderStyle: 'dashed', borderColor: '#9CA3AF' },
  
  // Custom Input UI
  customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', width: '100%' },
  customInput: { flex: 1, fontSize: 16, paddingHorizontal: 10 },
  addBtn: { backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: '600' },
  cancelText: { fontSize: 18, color: '#9CA3AF', paddingHorizontal: 5 },

  // Buttons
  editBtn: { backgroundColor: '#111827', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 11 },
  editBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#374151', borderRadius: 999, paddingHorizontal: 36, paddingVertical: 11 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
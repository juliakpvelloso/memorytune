import { useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { NavigateFn } from '../types';

const ERAS = ['1950s', '1960s', '1970s', '1980s', '1990s'];

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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: '#111827', fontWeight: '300' },
  logo:     { width: 48, height: 48, opacity: 0.45 },
  spacer:   { width: 40 },
});

export default function EditPatientProfile({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();

  const [name,      setName]      = useState('Margaret Thompson');
  const [birthYear, setBirthYear] = useState('1947');
  const [era,       setEra]       = useState('1960s');

  const [editingName,  setEditingName]  = useState(false);
  const [editingYear,  setEditingYear]  = useState(false);
  const [editingEra,   setEditingEra]   = useState(false);

  const [saving, setSaving] = useState(false);

  // Load real profile from backend on mount
  useEffect(() => {
    api.getUserProfile()
      .then(p => {
        setName(p.name);
        setBirthYear(p.birth_year);
        setEra(p.era);
      })
      .catch(() => { /* server not running – keep defaults */ });
  }, []);

  const saveName = async () => {
    setEditingName(false);
    setSaving(true);
    try { await api.updateUserProfile({ name }); } catch { /* ignore */ }
    setSaving(false);
  };

  const saveYear = async () => {
    setEditingYear(false);
    setSaving(true);
    try { await api.updateUserProfile({ birth_year: birthYear }); } catch { /* ignore */ }
    setSaving(false);
  };

  const saveEra = async (newEra: string) => {
    setEra(newEra);
    setEditingEra(false);
    setSaving(true);
    try { await api.updateUserProfile({ era: newEra, era_preferences: [newEra] }); } catch { /* ignore */ }
    setSaving(false);
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

        <ScreenHeader onBack={() => navigate('caregiverDashboard')} />
        <Text style={styles.title}>Edit Patient Profile</Text>

        {saving && <Text style={styles.savingBadge}>Saving…</Text>}

        <View style={styles.card}>
          {/* Photo placeholder */}
          <View style={styles.photoCircle}>
            <View style={styles.photoHead} />
            <View style={styles.photoShoulders} />
          </View>

          {/* ── Name ── */}
          {editingName ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
              blurOnSubmit
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.patientName}>{name}</Text>
          )}
          {editingName ? (
            <Pressable style={styles.saveBtn} onPress={saveName}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.editBtn} onPress={() => setEditingName(true)}>
              <Text style={styles.editBtnIcon}>✏</Text>
              <Text style={styles.editBtnText}>Edit Name</Text>
            </Pressable>
          )}

          <View style={styles.divider} />

          {/* ── Birth Year ── */}
          {editingYear ? (
            <TextInput
              style={styles.yearInput}
              value={birthYear}
              onChangeText={setBirthYear}
              autoFocus
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={saveYear}
              blurOnSubmit
              maxLength={4}
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.bigNumber}>{birthYear}</Text>
          )}
          <Text style={styles.fieldLabel}>Birth Year</Text>
          {editingYear ? (
            <Pressable style={styles.saveBtn} onPress={saveYear}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.editBtn} onPress={() => setEditingYear(true)}>
              <Text style={styles.editBtnIcon}>✏</Text>
              <Text style={styles.editBtnText}>Edit Year</Text>
            </Pressable>
          )}

          <View style={styles.divider} />

          {/* ── Memory Era ── */}
          <Text style={styles.sectionLabel}>Memory Era</Text>
          {editingEra ? (
            <View style={styles.eraPickerWrap}>
              {ERAS.map(e => (
                <Pressable
                  key={e}
                  style={[styles.eraPill, era === e && styles.eraPillSelected]}
                  onPress={() => saveEra(e)}>
                  <Text style={[styles.eraPillText, era === e && styles.eraPillTextSelected]}>
                    {e}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.eraBox}>
              <Text style={styles.eraText}>{era}</Text>
            </View>
          )}
          {editingEra ? (
            <Pressable style={styles.saveBtn} onPress={() => setEditingEra(false)}>
              <Text style={styles.saveBtnText}>Done</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.editBtn} onPress={() => setEditingEra(true)}>
              <Text style={styles.editBtnIcon}>✏</Text>
              <Text style={styles.editBtnText}>Edit Era</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: '#FFFFFF' },
  container:  { paddingHorizontal: 20 },
  title:      { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 20 },
  savingBadge: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 14,
  },
  photoCircle: {
    width: 90, height: 90,
    borderRadius: 45,
    backgroundColor: '#D1D5DB',
    borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 4,
  },
  photoHead: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
    position: 'absolute',
    top: 16,
  },
  photoShoulders: {
    width: 70, height: 40,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
  patientName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  nameInput: {
    fontSize: 20, fontWeight: '700', color: '#111827',
    borderBottomWidth: 2, borderBottomColor: '#111827',
    paddingVertical: 4, paddingHorizontal: 8,
    minWidth: 200, textAlign: 'center',
  },
  bigNumber:  { fontSize: 60, fontWeight: '800', color: '#111827', lineHeight: 68 },
  yearInput: {
    fontSize: 60, fontWeight: '800', color: '#111827', lineHeight: 68,
    borderBottomWidth: 2, borderBottomColor: '#111827',
    paddingHorizontal: 8, paddingVertical: 4,
    minWidth: 140, textAlign: 'center',
  },
  fieldLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginTop: -8 },
  sectionLabel: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  eraBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1, borderColor: '#E5E7EB',
    width: '100%', alignItems: 'center',
    paddingVertical: 18,
  },
  eraText: { fontSize: 44, fontWeight: '800', color: '#111827' },
  eraPickerWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 10,
    width: '100%', paddingVertical: 4,
  },
  eraPill: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#D1D5DB',
  },
  eraPillSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  eraPillText:     { fontSize: 15, fontWeight: '600', color: '#374151' },
  eraPillTextSelected: { color: '#FFFFFF' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#111827',
    borderRadius: 999, paddingHorizontal: 28, paddingVertical: 11,
  },
  editBtnIcon: { color: '#FFFFFF', fontSize: 13 },
  editBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', letterSpacing: 0.2 },
  saveBtn: {
    backgroundColor: '#374151',
    borderRadius: 999, paddingHorizontal: 36, paddingVertical: 11,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  divider:    { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
});

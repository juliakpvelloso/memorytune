import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { NavigateFn } from '../types';

// ── Icon components ──────────────────────────────────────────────────────────

function MusicNoteIcon() {
  return (
    <View style={iconS.root}>
      <View style={iconS.beam} />
      <View style={iconS.stemLeft} />
      <View style={[iconS.head, iconS.headLeft]} />
      <View style={iconS.stemRight} />
      <View style={[iconS.head, iconS.headRight]} />
    </View>
  );
}

function PersonIcon() {
  return (
    <View style={iconS.root}>
      <View style={iconS.personHead} />
      <View style={iconS.personShoulders} />
    </View>
  );
}

function GearIcon() {
  return (
    <View style={iconS.root}>
      <View style={iconS.gearOuter}>
        <View style={iconS.gearInner} />
      </View>
    </View>
  );
}

function BarChartIcon() {
  return (
    <View style={iconS.barsRow}>
      <View style={[iconS.bar, { height: 14 }]} />
      <View style={[iconS.bar, { height: 22 }]} />
      <View style={[iconS.bar, { height: 10 }]} />
    </View>
  );
}

const ICON_COLOR = '#111827';

const iconS = StyleSheet.create({
  root: { width: 32, height: 32 },
  beam: {
    position: 'absolute',
    top: 4, left: 10,
    width: 14, height: 3,
    backgroundColor: ICON_COLOR,
    borderRadius: 1.5,
  },
  stemLeft: {
    position: 'absolute',
    top: 4, left: 10,
    width: 2.5, height: 18,
    backgroundColor: ICON_COLOR,
    borderRadius: 1,
  },
  stemRight: {
    position: 'absolute',
    top: 4, left: 21,
    width: 2.5, height: 14,
    backgroundColor: ICON_COLOR,
    borderRadius: 1,
  },
  head: {
    position: 'absolute',
    width: 9, height: 7,
    borderRadius: 5,
    backgroundColor: ICON_COLOR,
    transform: [{ rotate: '-20deg' }],
  },
  headLeft:  { bottom: 5, left: 6 },
  headRight: { bottom: 9, left: 17 },
  personHead: {
    width: 14, height: 14,
    borderRadius: 7,
    backgroundColor: ICON_COLOR,
    alignSelf: 'center',
    marginTop: 2, marginBottom: 2,
  },
  personShoulders: {
    width: 26, height: 13,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    backgroundColor: ICON_COLOR,
    alignSelf: 'center',
  },
  gearOuter: {
    width: 24, height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: ICON_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    alignSelf: 'center',
  },
  gearInner: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: ICON_COLOR,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4, height: 28,
    marginTop: 2,
  },
  bar: { width: 7, backgroundColor: ICON_COLOR, borderRadius: 2 },
});

// ── Nav button ───────────────────────────────────────────────────────────────

type NavButtonProps = { icon: ReactNode; label: string; onPress: () => void };

function NavButton({ icon, label, onPress }: NavButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}>
      <View style={styles.navBtnCircle}>{icon}</View>
      <Text style={styles.navBtnLabel}>{label}</Text>
    </Pressable>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function CaregiverDashboard({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();
  const [patientName, setPatientName]         = useState('');
  const [lastPlayed, setLastPlayed]           = useState('');
  const [listeningMins, setListeningMins]     = useState(0);
  const [profilePic, setProfilePic] = useState(null); // Add this

  useEffect(() => {
  api.getUserProfile()
    .then(profile => {
      setPatientName(profile.name);
      setProfilePic(profile.profile_image); // Update this based on your API key
      setLastPlayed(profile.last_played);
      setListeningMins(profile.listening_today_minutes);
    })
    .catch(() => { /* keep defaults */ });
}, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
      ]}>

      {/* Header */}
      <View style={styles.logoRow}>
        <View style={styles.logoSide} />
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.logoSide}>
          <Pressable onPress={() => { api.caregiverSignOut(); navigate('login'); }} hitSlop={12}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.title}>Dashboard</Text>

      {/* Patient card */}
      <View style={styles.card}>
        <View style={styles.photoArea}>
          <View style={styles.profileCircle}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.fullImage} />
          ) : (
            <View style={styles.placeholderGroup}>
              <View style={styles.photoHead} />
              <View style={styles.photoShoulders} />
            </View>
          )}
        </View>
      </View>

        <View style={styles.infoSection}>
          <Text style={styles.patientName}>{patientName}</Text>
          <View style={styles.statRow}>
            <Text style={styles.statText}>Last Played: {lastPlayed}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statText}>Listening today: {listeningMins} minutes</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.navGrid}>
          <NavButton icon={<MusicNoteIcon />}  label="Manage Music"         onPress={() => navigate('manageMusic')} />
          <NavButton icon={<PersonIcon />}     label="Edit Patient Profile"  onPress={() => navigate('editPatientProfile')} />
          <NavButton icon={<GearIcon />}       label="Safety Settings"       onPress={() => navigate('safetySettings')} />
          <NavButton icon={<BarChartIcon />}   label="Listening Insights"    onPress={() => navigate('listeningInsights')} />
        </View>
      </View>

      {/* Switch to patient view */}
      <Pressable
        style={({ pressed }) => [styles.switchBtn, pressed && styles.switchBtnPressed]}
        onPress={() => navigate('patientFromCaregiver')}>
        <Text style={styles.switchBtnIcon}>♪</Text>
        <Text style={styles.switchBtnText}>Switch to Patient View</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logoSide: { width: 70, alignItems: 'flex-end' },
  logo:      { width: 48, height: 48, opacity: 0.45 },
  logoutText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  connectStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  connectStripText:  { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1 },
  connectStripArrow: { fontSize: 16, color: '#6B7280', marginLeft: 8 },
  card: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 14,
  },
  photoArea: { 
    width: '100%', 
    height: 140, // Increased slightly to accommodate the circle
    backgroundColor: '#D1D5DB', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  profileCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#F3F4F6',
    overflow: 'hidden', // Ensures the image stays round
    alignItems: 'center',
    justifyContent: 'center',
    // Optional: Add a slight shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoSection: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 5 },
  patientName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  statRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon:    { fontSize: 14, color: '#374151' },
  statText:    { fontSize: 14, color: '#374151', fontWeight: '500' },
  cardDivider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 20 },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
    rowGap: 16,
  },
  navBtn:        { width: '47%', alignItems: 'center', gap: 8 },
  navBtnPressed: { opacity: 0.7 },
  navBtnCircle: {
    width: 76, height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnLabel: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'center' },
  switchBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  switchBtnPressed:  { backgroundColor: '#F3F4F6' },
  switchBtnIcon:     { fontSize: 14, color: '#6B7280' },
  switchBtnText:     { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  placeholderGroup: { alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%' },
  photoHead: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111827', opacity: 0.7, position: 'absolute', top: 16 },
  photoShoulders: { width: 70, height: 40, borderTopLeftRadius: 35, borderTopRightRadius: 35, backgroundColor: '#111827', opacity: 0.5 },
  
});

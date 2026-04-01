import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigateFn } from '../types';

// ── Icon components (view-based, no external library) ──────────────────────

function MusicNoteIcon() {
  return (
    <View style={iconS.root}>
      {/* Two eighth notes */}
      <View style={iconS.noteGroup}>
        <View style={iconS.noteLeft}>
          <View style={iconS.noteHead} />
          <View style={iconS.noteStem} />
        </View>
        <View style={iconS.noteRight}>
          <View style={iconS.noteHead} />
          <View style={iconS.noteStem} />
        </View>
        <View style={iconS.noteBeam} />
      </View>
    </View>
  );
}

function PersonIcon() {
  return (
    <View style={iconS.root}>
      <View style={iconS.head} />
      <View style={iconS.shoulders} />
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
  root: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Music notes
  noteGroup: {
    width: 28,
    height: 22,
    position: 'relative',
  },
  noteLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    alignItems: 'center',
  },
  noteRight: {
    position: 'absolute',
    left: 12,
    bottom: 4,
    alignItems: 'center',
  },
  noteHead: {
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: ICON_COLOR,
    transform: [{ rotate: '-15deg' }],
  },
  noteStem: {
    width: 2,
    height: 14,
    backgroundColor: ICON_COLOR,
    marginTop: -1,
    alignSelf: 'flex-end',
  },
  noteBeam: {
    position: 'absolute',
    top: 0,
    left: 10,
    width: 16,
    height: 2.5,
    backgroundColor: ICON_COLOR,
    borderRadius: 1,
  },
  // Person
  head: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ICON_COLOR,
    marginBottom: 2,
  },
  shoulders: {
    width: 26,
    height: 13,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    backgroundColor: ICON_COLOR,
  },
  // Gear
  gearOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: ICON_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ICON_COLOR,
  },
  // Bar chart
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 28,
  },
  bar: {
    width: 7,
    backgroundColor: ICON_COLOR,
    borderRadius: 2,
  },
});

// ── Dashboard button ────────────────────────────────────────────────────────

type NavButtonProps = {
  icon: ReactNode;
  label: string;
  onPress: () => void;
};

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

// ── Screen ──────────────────────────────────────────────────────────────────

export default function CaregiverDashboard({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
      ]}>
      {/* Logo header */}
      <View style={styles.logoRow}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Dashboard</Text>

      {/* Main card */}
      <View style={styles.card}>
        {/* Patient cover / photo area */}
        <View style={styles.photoArea} />

        {/* Patient info */}
        <View style={styles.infoSection}>
          <Text style={styles.patientName}>Margaret Thompson</Text>
          <View style={styles.statRow}>
            <Text style={styles.statIcon}>♪</Text>
            <Text style={styles.statText}>Last Played: Beyond the Sea</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statIcon, styles.bulbIcon]}>💡</Text>
            <Text style={styles.statText}>Listening today: 42 minutes</Text>
          </View>
        </View>

        {/* 2×2 nav grid */}
        <View style={styles.navGrid}>
          <NavButton
            icon={<MusicNoteIcon />}
            label="Manage Music"
            onPress={() => navigate('manageMusic')}
          />
          <NavButton
            icon={<PersonIcon />}
            label="Edit Patient Profile"
            onPress={() => navigate('editPatientProfile')}
          />
          <NavButton
            icon={<GearIcon />}
            label="Safety Settings"
            onPress={() => navigate('safetySettings')}
          />
          <NavButton
            icon={<BarChartIcon />}
            label="Listening Insights"
            onPress={() => navigate('listeningInsights')}
          />
        </View>
      </View>

      {/* Back to patient view */}
      <Pressable style={styles.switchBtn} onPress={() => navigate('patient')}>
        <Text style={styles.switchBtnText}>← Patient View</Text>
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
    alignItems: 'center',
    marginBottom: 4,
  },
  logo: {
    width: 48,
    height: 48,
    opacity: 0.45,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  card: {
    flex: 1,
    backgroundColor: '#C8C8C8',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
  },
  photoArea: {
    width: '100%',
    height: 130,
    backgroundColor: '#ADADAD',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 5,
  },
  patientName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    fontSize: 15,
    color: '#374151',
  },
  bulbIcon: {
    fontSize: 14,
  },
  statText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    justifyContent: 'space-between',
    rowGap: 16,
  },
  navBtn: {
    width: '47%',
    alignItems: 'center',
    gap: 8,
  },
  navBtnPressed: {
    opacity: 0.75,
  },
  navBtnCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  switchBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  switchBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

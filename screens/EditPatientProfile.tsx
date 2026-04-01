import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigateFn } from '../types';

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={headerS.row}>
      <Pressable onPress={onBack} style={headerS.backBtn} hitSlop={12}>
        <Text style={headerS.backText}>←</Text>
      </Pressable>
      <Image
        source={require('../assets/logo.png')}
        style={headerS.logo}
        resizeMode="contain"
      />
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
  spacer: {
    width: 40,
  },
});

function ActionButton({ label }: { label: string }) {
  return (
    <Pressable style={styles.actionBtn}>
      <Text style={styles.actionBtnText}>{label}</Text>
    </Pressable>
  );
}

export default function EditPatientProfile({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}>
      <ScreenHeader onBack={() => navigate('caregiverDashboard')} />

      <Text style={styles.title}>Edit Patient Profile</Text>

      <View style={styles.card}>
        {/* Patient photo */}
        <View style={styles.photoCircle}>
          <View style={styles.photoHead} />
          <View style={styles.photoShoulders} />
        </View>

        {/* Name */}
        <Text style={styles.patientName}>Margaret Thompson</Text>
        <ActionButton label="Edit Name" />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Birth year */}
        <Text style={styles.bigNumber}>1947</Text>
        <Text style={styles.fieldLabel}>Birth Year</Text>
        <ActionButton label="Edit Year" />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Memory Era */}
        <Text style={styles.sectionLabel}>Memory Era</Text>
        <View style={styles.eraBox}>
          <Text style={styles.eraText}>1960s</Text>
        </View>
        <ActionButton label="Edit Era" />
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#C8C8C8',
    borderRadius: 24,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 14,
  },
  photoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#A0A0A0',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 4,
  },
  photoHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
    position: 'absolute',
    top: 16,
  },
  photoShoulders: {
    width: 70,
    height: 40,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  bigNumber: {
    fontSize: 60,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 68,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    marginTop: -8,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  eraBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 18,
  },
  eraText: {
    fontSize: 44,
    fontWeight: '800',
    color: '#111827',
  },
  actionBtn: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 11,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#ADADAD',
    marginVertical: 4,
  },
});

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type Role = 'patient' | 'caregiver' | null;

export default function LoginScreen({ navigate }: { navigate: NavigateFn }) {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPatient = role === 'patient';

  const handleLogin = async () => {
    if (!role) return;
    if (role === 'patient') {
      navigate('patient');
      return;
    }
    // Caregiver: authenticate via Firebase
    setLoading(true);
    try {
      const ok = await api.caregiverSignIn(email, password);
      if (ok) {
        navigate('caregiverDashboard');
      } else {
        Alert.alert('Sign in failed', 'Please check your email and password.');
      }
    } catch {
      Alert.alert('Sign in failed', 'Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canLogin =
    role === 'patient' ||
    (role === 'caregiver' && email.length > 0 && password.length > 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Logo + brand */}
        <View style={styles.brand}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>MemoryTune</Text>
          <Text style={styles.tagline}>Music for every memory</Text>
        </View>

        {/* Role selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>I am a…</Text>
          <View style={styles.roleRow}>
            <RoleCard
              title="Patient"
              subtitle="Simple music player"
              icon="♪"
              selected={role === 'patient'}
              onPress={() => setRole('patient')}
            />
            <RoleCard
              title="Caregiver"
              subtitle="Manage & monitor"
              icon="♡"
              selected={role === 'caregiver'}
              onPress={() => setRole('caregiver')}
            />
          </View>
        </View>

        {/* Credential fields */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sign in</Text>

          <View
            style={[
              styles.inputWrap,
              emailFocused && styles.inputWrapFocused,
              isPatient && styles.inputWrapLarge,
            ]}>
            <TextInput
              style={[styles.input, isPatient && styles.inputLarge]}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          <View
            style={[
              styles.inputWrap,
              passwordFocused && styles.inputWrapFocused,
              isPatient && styles.inputWrapLarge,
              { marginTop: 12 },
            ]}>
            <TextInput
              style={[styles.input, isPatient && styles.inputLarge]}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
          </View>

          {!isPatient && (
            <Pressable style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          )}
        </View>

        {/* Login button */}
        <Pressable
          style={({ pressed }) => [
            styles.loginBtn,
            isPatient && styles.loginBtnLarge,
            (!canLogin || loading) && styles.loginBtnDisabled,
            pressed && canLogin && !loading && styles.loginBtnPressed,
          ]}
          onPress={handleLogin}
          disabled={!canLogin || loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.loginBtnText, isPatient && styles.loginBtnTextLarge]}>
              {role === 'patient' ? 'Start Listening' : role === 'caregiver' ? 'Go to Dashboard' : 'Sign In'}
            </Text>
          )}
        </Pressable>

        {!isPatient && (
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>New to MemoryTune? </Text>
            <Pressable>
              <Text style={styles.signupLink}>Create account</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.roleCard,
        selected && styles.roleCardSelected,
        pressed && !selected && styles.roleCardPressed,
      ]}
      onPress={onPress}>
      <Text style={[styles.roleIcon, selected && styles.roleIconSelected]}>
        {icon}
      </Text>
      <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>
        {title}
      </Text>
      <Text style={[styles.roleSubtitle, selected && styles.roleSubtitleSelected]}>
        {subtitle}
      </Text>
      {selected && <View style={styles.roleCheckDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },

  /* Brand */
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    letterSpacing: 0.2,
  },

  /* Section */
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  /* Role cards */
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  roleCardSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  roleCardPressed: {
    backgroundColor: '#E5E7EB',
  },
  roleIcon: {
    fontSize: 28,
    marginBottom: 8,
    color: '#6B7280',
  },
  roleIconSelected: {
    color: '#FFFFFF',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: '#FFFFFF',
  },
  roleSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  roleSubtitleSelected: {
    color: '#D1D5DB',
  },
  roleCheckDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  /* Inputs */
  inputWrap: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWrapFocused: {
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputWrapLarge: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  input: {
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  inputLarge: {
    fontSize: 20,
  },
  forgotWrap: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  forgotText: {
    fontSize: 13,
    color: '#6B7280',
  },

  /* Login button */
  loginBtn: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginBtnLarge: {
    borderRadius: 20,
    paddingVertical: 22,
  },
  loginBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  loginBtnPressed: {
    backgroundColor: '#374151',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginBtnTextLarge: {
    fontSize: 22,
    letterSpacing: 0.2,
  },

  /* Sign up */
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
});

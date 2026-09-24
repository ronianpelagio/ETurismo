import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../../services/supabase';
import { useAppTheme } from '../../../context/ThemeContext';
import { LocationFields, LocationValue } from '../../../features/auth/components/LocationFields';

export default function PersonalInfo({ navigation }: any) {
  const { theme } = useAppTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState<LocationValue>({
    countryCode: '', country: '', province: null, city: null,
    barangay: null, stateRegion: '', cityText: '', addressLine: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('users').select('*').eq('id', auth.user.id).single();
      if (error) throw error;
      setProfile(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setLocation({
        countryCode: data.country === 'Philippines' ? 'PH' : '',
        country: data.country || '', province: null, city: null,
        barangay: null, stateRegion: data.province || '',
        cityText: data.city || '', addressLine: data.Address || '',
      });
    } catch (error: any) {
      Alert.alert('Unable to load profile', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openEditor() {
    setFirstName(profile?.first_name || '');
    setLastName(profile?.last_name || '');
    setLocation({
      countryCode: profile?.country === 'Philippines' ? 'PH' : '',
      country: profile?.country || '', province: null, city: null,
      barangay: null, stateRegion: profile?.province || '',
      cityText: profile?.city || '', addressLine: profile?.Address || '',
    });
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
  }

  async function saveProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First name and last name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const isPH = location.countryCode === 'PH';
      const address = isPH
        ? [location.addressLine, location.barangay?.name, location.city?.name, location.province?.name, 'Philippines'].filter(Boolean).join(', ')
        : [location.addressLine, location.cityText, location.stateRegion, location.country].filter(Boolean).join(', ');
      const updates = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        Address: address || null,
        country: location.country || null,
        province: isPH ? location.province?.name || null : location.stateRegion || null,
        city: isPH ? location.city?.name || null : location.cityText || null,
        barangay: isPH ? location.barangay?.name || null : null,
      };
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', auth.user.id)
        .select('*')
        .single();
      if (error) throw error;
      setProfile(data);
      setEditorOpen(false);
    } catch (error: any) {
      Alert.alert('Save failed', error.message || 'Check your Supabase profile update policy.');
    } finally {
      setSaving(false);
    }
  }

  const colors = {
    bg: theme.bg, surface: theme.surface, ink: theme.ink,
    muted: theme.inkMid, dim: theme.inkDim, gold: theme.gold, goldSoft: theme.goldSoft,
    border: theme.border, deep: theme.deep,
  };
  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase() || '?';

  if (loading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><ActivityIndicator style={{ flex: 1 }} color={colors.gold} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Personal Info</Text>
          <TouchableOpacity onPress={openEditor} style={{ backgroundColor: colors.gold, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Edit</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[colors.goldSoft, colors.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ alignItems: 'center', paddingVertical: 28, marginBottom: 10 }}
        >
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>{initials}</Text>
          </View>
          <Text style={{ marginTop: 14, color: colors.ink, fontSize: 22, fontWeight: '800' }}>
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text style={{ color: colors.dim, marginTop: 4 }}>{profile?.email}</Text>
        </LinearGradient>

        <InfoRow label="Gender" value={profile?.gender || 'Not provided'} colors={colors} />
        <InfoRow label="Age" value={profile?.age ? `${profile.age} years` : 'Not provided'} colors={colors} />
        <InfoRow label="Address" value={profile?.Address || 'Not provided'} colors={colors} />
        <InfoRow label="Location" value={profile?.Address || 'Not provided'} colors={colors} />
        <View style={{ margin: 20, padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>Tap Edit to update your name and location. Your email address cannot be changed here.</Text>
        </View>
      </ScrollView>

      <Modal visible={editorOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEditor}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="always" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800' }}>Edit Personal Info</Text>
                <TouchableOpacity onPress={closeEditor} disabled={saving} style={{ padding: 8 }}>
                  <Ionicons name="close" size={24} color={colors.ink} />
                </TouchableOpacity>
              </View>
              <EditField label="First name" value={firstName} onChangeText={setFirstName} colors={colors} autoFocus />
              <EditField label="Last name" value={lastName} onChangeText={setLastName} colors={colors} />
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>LOCATION</Text>
              <LocationFields value={location} onChange={setLocation} />
              <EditField label="Email address" value={profile?.email || ''} colors={colors} editable={false} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={closeEditor} disabled={saving} style={{ flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                  <Text style={{ color: colors.muted, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveProfile} disabled={saving} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center' }}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, colors }: any) {
  return <View style={{ marginHorizontal: 20, marginBottom: 10, padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.dim, fontSize: 11, marginBottom: 4 }}>{label}</Text><Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>{value}</Text></View>;
}

function EditField({ label, value, onChangeText, colors, editable = true, keyboardType, autoFocus = false }: any) {
  return <View style={{ marginBottom: 16 }}><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 7 }}>{label}</Text><TextInput editable={editable} autoFocus={autoFocus} value={value} onChangeText={onChangeText} keyboardType={keyboardType} showSoftInputOnFocus={editable} autoCapitalize={keyboardType === 'phone-pad' ? 'none' : 'words'} style={{ backgroundColor: editable ? colors.surface : colors.deep, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, color: editable ? colors.ink : colors.dim, fontSize: 15 }} /></View>;
}

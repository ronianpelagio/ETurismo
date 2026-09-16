import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Image,
  Dimensions,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons as Icon } from '@expo/vector-icons';
import {
  LocationFields,
  LocationValue,
} from '../../features/auth/components/LocationFields';
import { savePendingProfile } from '../../features/auth/services/pendingProfile';

/* ============================================================================
   THEME
============================================================================ */

const C = {
  background: '#F6F2EA',
  card:        '#FFFFFF',
  ink:         '#191611',
  inkSoft:     '#302A22',
  inkMid:      '#6E665B',
  inkLight:    '#A59C90',
  gold:        '#B99345',
  goldLight:   '#D8BD7A',
  goldSoft:    '#F5ECD9',
  border:      '#E5DED2',
  borderFocus: '#B99345',
  error:       '#B63B32',
  errorLight:  '#FFF1EF',
  white:       '#FFFFFF',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ============================================================================
   TYPES
============================================================================ */

type Gender = 'Male' | 'Female' | 'Other';

/* ============================================================================
   STEP CONFIG
============================================================================ */

const STEPS = [
  { label: 'Profile',   icon: 'person-outline'   },
  { label: 'Location',  icon: 'navigate-outline' },
  { label: 'Account',   icon: 'lock-closed-outline' },
] as const;

/* ============================================================================
   FIELD
============================================================================ */

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  secure = false,
  showToggle = false,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secure?: boolean;
  showToggle?: boolean;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const fade = (v: number) =>
    Animated.timing(anim, { toValue: v, duration: 180, useNativeDriver: false }).start();
  const borderColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? C.error : C.border, error ? C.error : C.borderFocus],
  });
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <Animated.View style={[s.inputBox, { borderColor }]}>
        <TextInput
          style={[s.input, showToggle && { paddingRight: 48 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.inkLight}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secure && !show}
          onFocus={() => fade(1)}
          onBlur={() => fade(0)}
        />
        {showToggle && (
          <TouchableOpacity style={s.eye} onPress={() => setShow(v => !v)} activeOpacity={0.7}>
            <Icon name={show ? 'eye-outline' : 'eye-off-outline'} size={19} color={C.inkLight} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? <View style={s.errRow}><Icon name="alert-circle-outline" size={13} color={C.error} /><Text style={s.errTxt}>{error}</Text></View> : null}
    </View>
  );
}

/* ============================================================================
   GENDER SELECTOR
============================================================================ */

function GenderSelector({
  selected,
  onSelect,
  error,
}: {
  selected: Gender | '';
  onSelect: (g: Gender) => void;
  error?: string;
}) {
  const opts: Gender[] = ['Male', 'Female', 'Other'];
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>GENDER</Text>
      <View style={s.genderRow}>
        {opts.map(o => {
          const active = selected === o;
          return (
            <TouchableOpacity
              key={o}
              style={[s.genderBtn, active && s.genderBtnActive]}
              onPress={() => onSelect(o)}
              activeOpacity={0.8}
            >
              {active && <Icon name="checkmark" size={13} color={C.white} />}
              <Text style={[s.genderTxt, active && s.genderTxtActive]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <View style={s.errRow}><Icon name="alert-circle-outline" size={13} color={C.error} /><Text style={s.errTxt}>{error}</Text></View> : null}
    </View>
  );
}

/* ============================================================================
   PROFILE PHOTO
============================================================================ */

function ProfilePhoto({
  uri,
  onPick,
  onRemove,
}: {
  uri: string | null;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={s.photoSection}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        {uri ? (
          <Image source={{ uri }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Icon name="person-outline" size={36} color={C.inkLight} />
          </View>
        )}
        <TouchableOpacity style={s.cameraBtn} onPress={onPick} activeOpacity={0.8}>
          <Icon name={uri ? 'create-outline' : 'camera-outline'} size={15} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={s.photoTitle}>{uri ? 'Photo selected' : 'Add profile photo'}</Text>
        <Text style={s.photoDesc}>
          {uri
            ? 'Uploaded securely after email verification.'
            : 'Optional · JPG or PNG · You can add one later.'}
        </Text>
        <View style={s.photoActions}>
          <TouchableOpacity style={s.photoBtn} onPress={onPick} activeOpacity={0.8}>
            <Icon name="image-outline" size={14} color={C.ink} />
            <Text style={s.photoBtnTxt}>{uri ? 'Change' : 'Choose Photo'}</Text>
          </TouchableOpacity>
          {uri && (
            <TouchableOpacity style={s.removeBtn} onPress={onRemove} activeOpacity={0.8}>
              <Icon name="trash-outline" size={14} color={C.error} />
              <Text style={s.removeBtnTxt}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
   TERMS CHECKBOX
============================================================================ */

function TermsBox({
  checked,
  onToggle,
  error,
}: {
  checked: boolean;
  onToggle: () => void;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity style={s.termsRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={[s.checkbox, checked && s.checkboxOn, error && s.checkboxErr]}>
          {checked && <Icon name="checkmark" size={12} color={C.white} />}
        </View>
        <Text style={s.termsTxt}>
          I agree to the{' '}
          <Text style={s.termsLink}>Terms & Privacy</Text>
        </Text>
      </TouchableOpacity>
      {error ? <View style={s.errRow}><Icon name="alert-circle-outline" size={13} color={C.error} /><Text style={s.errTxt}>{error}</Text></View> : null}
    </View>
  );
}

/* ============================================================================
   STEP INDICATOR
============================================================================ */

function StepIndicator({ current }: { current: number }) {
  return (
    <View style={s.stepRow}>
      {STEPS.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        const pending = i > current;
        return (
          <React.Fragment key={i}>
            <View style={s.stepItem}>
              <View style={[
                s.stepCircle,
                active  && s.stepCircleActive,
                done    && s.stepCircleDone,
              ]}>
                {done
                  ? <Icon name="checkmark" size={12} color={C.white} />
                  : <Text style={[s.stepNum, (active || done) && s.stepNumOn]}>{i + 1}</Text>
                }
              </View>
              <Text style={[s.stepLbl, active && s.stepLblActive, done && s.stepLblDone]}>
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[s.stepLine, (i < current) && s.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* ============================================================================
   MAIN SCREEN
============================================================================ */

export default function SignUp({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0); // 0 = Profile, 1 = Location, 2 = Account

  /* ── State ──────────────────────────────────────────────────────────────── */

  // Step 0 — Profile
  const [firstName,     setFirstName]     = useState('');
  const [lastName,      setLastName]      = useState('');
  const [gender,        setGender]        = useState<Gender | ''>('');
  const [age,           setAge]           = useState('');
  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);

  // Step 1 — Location
  const [location, setLocation] = useState<LocationValue>({
    countryCode: '',
    country:     '',
    province:    null,
    city:        null,
    barangay:    null,
    addressLine: '',
    stateRegion: '',
    cityText:    '',
    addressText: '',
  });

  // Step 2 — Account
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // General
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  /* ── Helpers ─────────────────────────────────────────────────────────────── */

  const clearErr = (k: string) => setErrors(p => ({ ...p, [k]: '' }));

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  /* ── Photo ───────────────────────────────────────────────────────────────── */

  const pickPhoto = () => {
    Alert.alert('Profile Photo', 'Choose a source', [
      { text: 'Camera',        onPress: takePhoto    },
      { text: 'Photo Library', onPress: chooseFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to take a photo.'); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!r.canceled && r.assets?.length) setProfilePicUri(r.assets[0].uri);
  };

  const chooseFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!r.canceled && r.assets?.length) setProfilePicUri(r.assets[0].uri);
  };

  const removePhoto = () => {
    Alert.alert('Remove Photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setProfilePicUri(null) },
    ]);
  };

  /* ── Validation ──────────────────────────────────────────────────────────── */

  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim())  e.lastName  = 'Last name is required';
    if (!gender)           e.gender    = 'Please select your gender';
    if (!age.trim()) {
      e.age = 'Age is required';
    } else {
      const n = parseInt(age, 10);
      if (isNaN(n) || n < 1 || n > 120) e.age = 'Enter a valid age';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!location.countryCode) {
      e.location = 'Select your country';
    } else if (location.countryCode === 'PH' && (!location.province || !location.city || !location.barangay)) {
      e.location = 'Select your province, city, and barangay';
    } else if (location.countryCode !== 'PH' && !location.stateRegion.trim() && !location.cityText.trim()) {
      e.location = 'Enter your state / region and city';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!email.trim())                   e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email   = 'Enter a valid email address';
    if (!password)                        e.password = 'Password is required';
    else if (password.length < 8)         e.password = 'Password must be at least 8 characters';
    if (!termsAccepted)                   e.terms    = 'You must accept the Terms & Privacy';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Navigation ──────────────────────────────────────────────────────────── */

  const goNext = () => {
    const valid = step === 0 ? validateStep0() : step === 1 ? validateStep1() : false;
    if (!valid) return;
    setErrors({});
    setStep(s => s + 1);
    scrollTop();
  };

  const goBack = () => {
    setErrors({});
    setStep(s => s - 1);
    scrollTop();
  };

  /* ── Submit ──────────────────────────────────────────────────────────────── */

  const handleSignUp = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      const address = location.countryCode === 'PH'
        ? [location.addressLine.trim(), location.barangay?.name, location.city?.name, location.province?.name, location.country].filter(Boolean).join(', ')
        : [location.addressText.trim(), location.cityText.trim(), location.stateRegion.trim(), location.country].filter(Boolean).join(', ');

      // Resize photo
      let resizedUri: string | null = null;
      if (profilePicUri) {
        const r = await ImageManipulator.manipulateAsync(
          profilePicUri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
        );
        resizedUri = r.uri;
      }

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name:  lastName.trim(),
            gender,
            age:        parseInt(age, 10),
            Address:    address,
            country:    location.country,
            province:   location.countryCode === 'PH' ? (location.province?.name ?? null) : (location.stateRegion.trim() || null),
            city:       location.countryCode === 'PH' ? (location.city?.name     ?? null) : (location.cityText.trim()    || null),
            barangay:   location.countryCode === 'PH' ? (location.barangay?.name ?? null) : null,
          },
        },
      });
      if (error) throw error;

      await savePendingProfile({
        email:         normalizedEmail,
        firstName:     firstName.trim(),
        lastName:      lastName.trim(),
        gender:        gender as Gender,
        age:           parseInt(age, 10),
        address,
        country:       location.country,
        province:      location.countryCode === 'PH' ? (location.province?.name ?? null) : (location.stateRegion.trim() || null),
        city:          location.countryCode === 'PH' ? (location.city?.name     ?? null) : (location.cityText.trim()    || null),
        barangay:      location.countryCode === 'PH' ? (location.barangay?.name ?? null) : null,
        profilePicUri: resizedUri,
      });

      await AsyncStorage.setItem(`otp_sent_at_${normalizedEmail}`, Date.now().toString());
      navigation.navigate('VerifyOTP', { email: normalizedEmail });

    } catch (err: any) {
      Alert.alert('Unable to Create Account', err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step meta ───────────────────────────────────────────────────────────── */

  const stepTitles = [
    'Tell us about yourself',
    'Where are you from?',
    'Secure your account',
  ];
  const stepDescs = [
    'Set up your profile so we can personalize your heritage journey.',
    'We use your location to personalise nearby sites and experiences.',
    'Create your login credentials and accept our terms.',
  ];

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <View style={s.screen}>
      <StatusBar style="light" />

      {/* Background */}
      <Image source={require('../../assets/Signin.jpg')} style={s.bg} />
      <View style={s.overlay} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>

            {/* ── Brand ── */}
            <View style={s.brand}>
              <View style={s.logoCircle}>
                <Icon name="map-outline" size={21} color={C.gold} />
              </View>
              <Text style={s.brandName}>ETURISMO</Text>
              <Text style={s.brandSub}>HERITAGE • CULTURE • JOURNEY</Text>
            </View>

            {/* ── Gold divider ── */}
            <View style={s.divider} />

            {/* ── Step indicator ── */}
            <StepIndicator current={step} />

            {/* ── Title ── */}
            <Text style={s.title}>{stepTitles[step]}</Text>
            <Text style={s.desc}>{stepDescs[step]}</Text>

            {/* ================================================================
                STEP 0 — Profile
            ================================================================ */}
            {step === 0 && (
              <View>
                {/* Photo */}
                <ProfilePhoto uri={profilePicUri} onPick={pickPhoto} onRemove={removePhoto} />

                {/* Name row */}
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="FIRST NAME"
                      value={firstName}
                      onChangeText={t => { setFirstName(t); clearErr('firstName'); }}
                      placeholder="First name"
                      autoCapitalize="words"
                      error={errors.firstName}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="LAST NAME"
                      value={lastName}
                      onChangeText={t => { setLastName(t); clearErr('lastName'); }}
                      placeholder="Last name"
                      autoCapitalize="words"
                      error={errors.lastName}
                    />
                  </View>
                </View>

                {/* Gender + Age row */}
                <View style={s.row}>
                  <View style={{ flex: 2 }}>
                    <GenderSelector
                      selected={gender}
                      onSelect={v => { setGender(v); clearErr('gender'); }}
                      error={errors.gender}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="AGE"
                      value={age}
                      onChangeText={t => { setAge(t.replace(/[^0-9]/g, '')); clearErr('age'); }}
                      placeholder="Age"
                      keyboardType="numeric"
                      error={errors.age}
                    />
                  </View>
                </View>

                <TouchableOpacity style={s.primaryBtn} onPress={goNext} activeOpacity={0.85}>
                  <Text style={s.primaryBtnTxt}>Continue</Text>
                  <Icon name="arrow-forward" size={17} color={C.white} />
                </TouchableOpacity>
              </View>
            )}

            {/* ================================================================
                STEP 1 — Location
            ================================================================ */}
            {step === 1 && (
              <View>
                <LocationFields
                  value={location}
                  onChange={v => { setLocation(v); clearErr('location'); }}
                  error={errors.location}
                />

                <TouchableOpacity style={s.primaryBtn} onPress={goNext} activeOpacity={0.85}>
                  <Text style={s.primaryBtnTxt}>Continue</Text>
                  <Icon name="arrow-forward" size={17} color={C.white} />
                </TouchableOpacity>

                <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
                  <Icon name="arrow-back" size={15} color={C.inkMid} />
                  <Text style={s.backBtnTxt}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================================================================
                STEP 2 — Account
            ================================================================ */}
            {step === 2 && (
              <View>
                <Field
                  label="EMAIL ADDRESS"
                  value={email}
                  onChangeText={t => { setEmail(t); clearErr('email'); }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  error={errors.email}
                />
                <Field
                  label="PASSWORD"
                  value={password}
                  onChangeText={t => { setPassword(t); clearErr('password'); }}
                  placeholder="At least 8 characters"
                  secure
                  showToggle
                  error={errors.password}
                />

                <TermsBox
                  checked={termsAccepted}
                  onToggle={() => { setTermsAccepted(v => !v); clearErr('terms'); }}
                  error={errors.terms}
                />

                <TouchableOpacity
                  style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator size="small" color={C.white} />
                    : <>
                        <Text style={s.primaryBtnTxt}>Create Account</Text>
                        <Icon name="checkmark-circle-outline" size={18} color={C.white} />
                      </>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
                  <Icon name="arrow-back" size={15} color={C.inkMid} />
                  <Text style={s.backBtnTxt}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Footer ── */}
            <View style={s.footer}>
              <Text style={s.footerTxt}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.7}>
                <Text style={s.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* ── Security badge ── */}
            <View style={s.security}>
              <Icon name="shield-checkmark-outline" size={13} color={C.gold} />
              <Text style={s.securityTxt}>Your information is securely protected</Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ============================================================================
   STYLES
============================================================================ */

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.background },
  bg:      { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(20,17,12,0.63)' },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 30,
  },

  /* Card */
  card: {
    width:           SCREEN_WIDTH > 600 ? 430 : '100%',
    backgroundColor: C.card,
    borderRadius:    22,
    paddingHorizontal: SCREEN_WIDTH > 600 ? 35 : 22,
    paddingTop:      26,
    paddingBottom:   22,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 12 },
    shadowOpacity:   0.22,
    shadowRadius:    24,
    elevation:       12,
  },

  /* Brand */
  brand:      { alignItems: 'center' },
  logoCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.goldSoft, borderWidth: 1, borderColor: '#E3D3B1',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  brandName: { color: C.ink, fontSize: 20, fontWeight: '900', letterSpacing: 3.5 },
  brandSub:  { color: C.gold, fontSize: 7, fontWeight: '800', letterSpacing: 1.5, marginTop: 3 },

  divider: {
    width: 30, height: 3, borderRadius: 2,
    backgroundColor: C.gold, alignSelf: 'center',
    marginTop: 14, marginBottom: 16,
  },

  /* Step indicator */
  stepRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: C.gold,    borderColor: C.gold },
  stepCircleDone:   { backgroundColor: C.ink,     borderColor: C.ink  },
  stepNum:    { color: C.inkLight,  fontSize: 10, fontWeight: '800' },
  stepNumOn:  { color: C.white },
  stepLbl:    { color: C.inkLight, fontSize: 8, fontWeight: '700', marginTop: 4 },
  stepLblActive: { color: C.gold },
  stepLblDone:   { color: C.inkMid },
  stepLine:     { width: 44, height: 1.5, backgroundColor: C.border,    marginHorizontal: 8, marginBottom: 16 },
  stepLineDone: { backgroundColor: C.ink },

  /* Titles */
  title: { color: C.ink, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4, marginBottom: 6 },
  desc:  { color: C.inkMid, fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 18, marginHorizontal: 8 },

  /* Field */
  fieldWrap: { marginBottom: 10 },
  label:     { color: C.inkMid, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 5 },
  inputBox: {
    minHeight: 47, backgroundColor: C.card, borderWidth: 1.3, borderColor: C.border,
    borderRadius: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  input: {
    flex: 1, color: C.ink, fontSize: 13.5,
    paddingHorizontal: 13, paddingVertical: Platform.OS === 'ios' ? 13 : 9,
  },
  eye:    { position: 'absolute', right: 10, padding: 6 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errTxt: { color: C.error, fontSize: 10 },

  row: { flexDirection: 'row', gap: 10 },

  /* Gender */
  genderRow:       { flexDirection: 'row', gap: 7 },
  genderBtn:       { flex: 1, height: 43, borderWidth: 1.3, borderColor: C.border, borderRadius: 9, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  genderBtnActive: { backgroundColor: C.ink, borderColor: C.ink },
  genderTxt:       { color: C.inkMid, fontSize: 11.5, fontWeight: '700' },
  genderTxtActive: { color: C.white },

  /* Profile photo */
  photoSection: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, backgroundColor: '#FCFAF6', marginBottom: 14,
  },
  avatarWrap:    { width: 74, height: 74, position: 'relative', marginRight: 13 },
  avatar:        { width: 74, height: 74, borderRadius: 37, borderWidth: 2, borderColor: C.gold, backgroundColor: C.goldSoft },
  avatarFallback:{ width: 74, height: 74, borderRadius: 37, backgroundColor: C.goldSoft, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cameraBtn:     { position: 'absolute', right: -3, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, borderWidth: 2, borderColor: C.card, alignItems: 'center', justifyContent: 'center' },
  photoTitle:    { color: C.ink, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  photoDesc:     { color: C.inkLight, fontSize: 9.5, lineHeight: 14, marginBottom: 7 },
  photoActions:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoBtn:      { height: 30, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', gap: 5 },
  photoBtnTxt:   { color: C.ink, fontSize: 9.5, fontWeight: '800' },
  removeBtn:     { height: 30, paddingHorizontal: 9, borderRadius: 7, backgroundColor: C.errorLight, borderWidth: 1, borderColor: '#F0D4D0', flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeBtnTxt:  { color: C.error, fontSize: 9.5, fontWeight: '800' },

  /* Terms */
  termsRow:    { flexDirection: 'row', alignItems: 'center' },
  checkbox:    { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  checkboxOn:  { backgroundColor: C.gold, borderColor: C.gold },
  checkboxErr: { borderColor: C.error },
  termsTxt:    { color: C.inkMid, fontSize: 10.5, flexShrink: 1 },
  termsLink:   { color: C.gold, fontWeight: '800', textDecorationLine: 'underline' },

  /* Buttons */
  primaryBtn: {
    height: 49, borderRadius: 10, backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.17, shadowRadius: 8, elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnTxt:      { color: C.white, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  backBtn:     { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2 },
  backBtnTxt:  { color: C.inkMid, fontSize: 10.5, fontWeight: '700' },

  /* Footer */
  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, marginTop: 16, paddingTop: 14 },
  footerTxt:  { color: C.inkMid, fontSize: 10.5 },
  footerLink: { color: C.gold, fontSize: 10.5, fontWeight: '900', marginLeft: 5 },

  /* Security */
  security:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 12 },
  securityTxt: { color: C.inkLight, fontSize: 8.5 },
});

import React, { useState, useRef, useEffect } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
  background: '#F6F2EA',
  card: '#FFFFFF',
  ink: '#191611',
  inkSoft: '#302A22',
  inkMid: '#6E665B',
  inkLight: '#A59C90',
  gold: '#B99345',
  goldDeep: '#9A7630',
  goldLight: '#D8BD7A',
  goldSoft: '#F5ECD9',
  field: '#FBF9F4',
  fieldFocus: '#FFFCF5',
  border: '#E5DED2',
  borderFocus: '#B99345',
  error: '#B63B32',
  errorLight: '#FFF1EF',
  success: '#4F8A5B',
  white: '#FFFFFF',
};

type Gender = 'Male' | 'Female' | 'Other';

// ─────────────────────────────────────────────────────────────
// Reusable Field
// ─────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = 'default',
  autoCapitalize = 'none',
  secure = false,
  showToggle = false,
  error,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  icon?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secure?: boolean;
  showToggle?: boolean;
  error?: string;
  maxLength?: number;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const animBorder = (v: number) =>
    Animated.timing(anim, {
      toValue: v,
      duration: 180,
      useNativeDriver: false,
    }).start();

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? C.error : C.border,
      error ? C.error : C.borderFocus,
    ],
  });

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.field, C.fieldFocus],
  });

  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>

      <Animated.View
        style={[
          s.inputBox,
          { borderColor, backgroundColor },
          focused && !error && s.inputBoxFocused,
        ]}
      >
        {icon ? (
          <Icon
            name={icon as any}
            size={16}
            color={error ? C.error : focused ? C.gold : C.inkLight}
            style={s.leadIcon}
          />
        ) : null}

        <TextInput
          style={[
            s.input,
            !icon && { paddingLeft: 14 },
            showToggle && { paddingRight: 46 },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.inkLight}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          secureTextEntry={secure && !show}
          onFocus={() => {
            setFocused(true);
            animBorder(1);
          }}
          onBlur={() => {
            setFocused(false);
            animBorder(0);
          }}
        />

        {showToggle && (
          <TouchableOpacity
            style={s.eyeBtn}
            onPress={() => setShow(v => !v)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name={show ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={C.inkMid}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {error ? (
        <View style={s.errRow}>
          <Icon name="alert-circle" size={13} color={C.error} />
          <Text style={s.errTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Password Strength
// ─────────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [C.error, C.error, '#D08A2E', C.success, C.success];

  return (
    <View style={s.strengthWrap}>
      <View style={s.strengthBars}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              s.strengthBar,
              i < score && { backgroundColor: colors[score] },
            ]}
          />
        ))}
      </View>

      <Text style={[s.strengthTxt, { color: colors[score] }]}>
        {labels[score]}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Gender Selector
// ─────────────────────────────────────────────────────────────

function GenderSelector({
  selected,
  onSelect,
  error,
}: {
  selected: Gender | '';
  onSelect: (g: Gender) => void;
  error?: string;
}) {
  const options: { key: Gender; icon: string }[] = [
    { key: 'Male', icon: 'male-outline' },
    { key: 'Female', icon: 'female-outline' },
    { key: 'Other', icon: 'male-female-outline' },
  ];

  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>GENDER</Text>

      <View style={s.segment}>
        {options.map(opt => {
          const active = selected === opt.key;

          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onSelect(opt.key)}
              activeOpacity={0.85}
              style={[s.genderBtn, active && s.genderBtnActive]}
            >
              <Icon
                name={opt.icon as any}
                size={15}
                color={active ? C.white : C.inkMid}
              />

              <Text style={[s.genderTxt, active && s.genderTxtActive]}>
                {opt.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View style={s.errRow}>
          <Icon name="alert-circle" size={13} color={C.error} />
          <Text style={s.errTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile Photo
// ─────────────────────────────────────────────────────────────

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
    <View style={s.photoWrap}>
      <View style={s.photoRow}>
        <TouchableOpacity
          style={s.avatarWrap}
          onPress={onPick}
          activeOpacity={0.85}
        >
          {uri ? (
            <Image source={{ uri }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Icon name="person-outline" size={30} color={C.gold} />
            </View>
          )}

          <View style={s.camBtn}>
            <Icon
              name={uri ? 'create-outline' : 'camera-outline'}
              size={14}
              color={C.white}
            />
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={s.photoTitle}>
            {uri ? 'Looking good!' : 'Add a profile photo'}
          </Text>

          <Text style={s.photoDesc}>
            Optional · JPG or PNG · You can add one later.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={s.photoBtn}
              onPress={onPick}
              activeOpacity={0.8}
            >
              <Icon name="image-outline" size={14} color={C.ink} />
              <Text style={s.photoBtnTxt}>{uri ? 'Change' : 'Choose'}</Text>
            </TouchableOpacity>

            {uri && (
              <TouchableOpacity
                style={s.removeBtn}
                onPress={onRemove}
                activeOpacity={0.8}
              >
                <Icon name="trash-outline" size={14} color={C.error} />
                <Text style={s.removeBtnTxt}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Terms Checkbox
// ─────────────────────────────────────────────────────────────

function TermsCheckbox({
  checked,
  onToggle,
  error,
}: {
  checked: boolean;
  onToggle: () => void;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 10, marginTop: 2 }}>
      <TouchableOpacity
        style={[s.termsRow, error && s.termsRowErr]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View
          style={[
            s.checkbox,
            checked && s.checkboxOn,
            error && s.checkboxErr,
          ]}
        >
          {checked && <Icon name="checkmark" size={14} color={C.white} />}
        </View>

        <Text style={s.termsTxt}>
          I agree to the <Text style={s.termsLink}>Terms & Privacy</Text>
        </Text>
      </TouchableOpacity>

      {error ? (
        <View style={s.errRow}>
          <Icon name="alert-circle" size={13} color={C.error} />
          <Text style={s.errTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Step Indicator (segmented progress)
// ─────────────────────────────────────────────────────────────

function StepBar({
  step,
  googleMode = false,
}: {
  step: number;
  googleMode?: boolean;
}) {
  const labels = googleMode
    ? ['Personal', 'Location']
    : ['Personal', 'Location', 'Account'];

  return (
    <View style={s.stepBar}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;

        return (
          <View key={n} style={s.stepItem}>
            <View
              style={[
                s.stepSeg,
                (done || active) && s.stepSegOn,
                active && s.stepSegActive,
              ]}
            />

            <View style={s.stepLabelRow}>
              {done ? (
                <Icon name="checkmark-circle" size={11} color={C.gold} />
              ) : null}

              <Text
                style={[
                  s.stepLabel,
                  (active || done) && s.stepLabelOn,
                ]}
              >
                {label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main SignUp
// ─────────────────────────────────────────────────────────────

export default function SignUp({
  navigation,
  googleMode = false,
  onGoogleComplete,
}: any) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);

  // Step 1 — Personal
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [age, setAge] = useState('');
  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);

  // Step 2 — Location
  const [location, setLocation] = useState<LocationValue>({
    countryCode: '',
    country: '',
    province: null,
    city: null,
    barangay: null,
    stateRegion: '',
    cityText: '',
    addressLine: '',
  });

  // Step 3 — Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step transition animation
  const stepAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [step, stepAnim]);

  // ───────────────────────────────────────────────────────────
  // Google profile — prefill from AsyncStorage (written by SignIn)
  // then fall back to supabase.auth.getUser() user_metadata
  // ───────────────────────────────────────────────────────────

  const [googleAvatarUrl, setGoogleAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!googleMode) return;

    (async () => {
      try {
        // 1. Try the cached profile written by SignIn right after OAuth
        const { data: authData } = await supabase.auth.getUser();

      const isFacebook =
        authData.user?.app_metadata?.provider === 'facebook' ||
        authData.user?.identities?.some(
          (identity) => identity.provider === 'facebook'
        );

      const cached = await AsyncStorage.getItem(
        isFacebook ? 'facebook_prefill_profile' : 'google_prefill_profile'
      );
        if (cached) {
          const profile = JSON.parse(cached) as {
            userId: string;
            email: string;
            firstName: string;
            lastName: string;
            profilePicture: string;
          };

          if (profile.email)         setEmail(profile.email);
          if (profile.firstName)     setFirstName(profile.firstName);
          if (profile.lastName)      setLastName(profile.lastName);
          if (profile.profilePicture) {
            setGoogleAvatarUrl(profile.profilePicture);
            // Do NOT set profilePicUri — Google avatar is treated as read-only URL
          }
          return;
        }

        // 2. Fallback — read directly from supabase session
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;

        const metadata = data.user.user_metadata ?? {};
        const fullName = metadata.full_name ?? metadata.name ?? '';

        if (data.user.email)     setEmail(data.user.email);
        if (metadata.given_name) setFirstName(metadata.given_name);
        else if (fullName)       setFirstName(fullName.split(' ')[0] ?? '');
        if (metadata.family_name) setLastName(metadata.family_name);
        else if (fullName)        setLastName(fullName.split(' ').slice(1).join(' ') ?? '');

        const avatarUrl = metadata.avatar_url ?? metadata.picture ?? '';
        if (avatarUrl) setGoogleAvatarUrl(avatarUrl);
      } catch (err) {
        console.warn('[SignUp] Could not load Google prefill:', err);
      }
    })();
  }, [googleMode]);

  const clearError = (f: string) =>
    setErrors(p => ({
      ...p,
      [f]: '',
    }));

  // ───────────────────────────────────────────────────────────
  // Photo Helpers
  // ───────────────────────────────────────────────────────────

  const pickPhoto = () =>
    Alert.alert('Profile Photo', 'Choose source', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Photo Library', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Please allow camera access.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.length) {
        setProfilePicUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert(
        'Camera Error',
        error?.message || 'Unable to open the camera.',
      );
    }
  };

  const openGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.length) {
        setProfilePicUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert(
        'Photo Library Error',
        error?.message || 'Unable to open the photo library.',
      );
    }
  };

  const removePhoto = () =>
    Alert.alert('Remove Photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setProfilePicUri(null),
      },
    ]);

  // ───────────────────────────────────────────────────────────
  // Validators
  // ───────────────────────────────────────────────────────────

  const validateStep1 = () => {
    const e: Record<string, string> = {};

    if (!firstName.trim()) {
      e.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      e.lastName = 'Last name is required';
    }

    if (!gender) {
      e.gender = 'Please select your gender';
    }

    if (!age.trim()) {
      e.age = 'Age is required';
    } else {
      const n = parseInt(age, 10);

      if (isNaN(n) || n < 1 || n > 100) {
        e.age = 'Age must be between 1 and 100';
      }
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};

    if (!location.countryCode) {
      e.location = 'Select your country';
    } else if (location.countryCode === 'PH') {
      if (
        !location.province ||
        !location.city ||
        !location.barangay
      ) {
        e.location = 'Select province, city/municipality, and barangay';
      }
    } else {
      if (!location.stateRegion.trim()) {
        e.location = 'Enter your state or region';
      } else if (!location.cityText.trim()) {
        e.location = 'Enter your city';
      }
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};

    if (!email.trim()) {
      e.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      e.email = 'Enter a valid email';
    }

    if (!password) {
      e.password = 'Password is required';
    } else if (password.length < 8) {
      e.password = 'At least 8 characters';
    }

    if (!termsAccepted) {
      e.terms = 'You must accept the Terms & Privacy';
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  // ───────────────────────────────────────────────────────────
  // Build Location/Profile Data
  // ───────────────────────────────────────────────────────────

  const buildProfileUpdate = () => {
    const isPH = location.countryCode === 'PH';

    const addressParts = isPH
      ? [
          location.addressLine,
          location.barangay?.name,
          location.city?.name,
          location.province?.name,
          'Philippines',
        ]
      : [
          location.addressLine,
          location.cityText,
          location.stateRegion,
          location.country,
        ];

    return {
      Address: addressParts.filter(Boolean).join(', '),

      country: location.country,

      province: isPH
        ? location.province?.name ?? null
        : location.stateRegion || null,

      city: isPH ? location.city?.name ?? null : location.cityText || null,

      barangay: isPH ? location.barangay?.name ?? null : null,
    };
  };

  // ───────────────────────────────────────────────────────────
  // Google Profile Completion
  // ───────────────────────────────────────────────────────────

  const handleGoogleProfile = async () => {
    if (!validateStep2()) return;

    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      const authUser = authData.user;

      if (!authUser) {
        throw new Error(
          'Your session has expired. Please sign in again.',
        );
      }

      const profileUpdate: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        age: parseInt(age, 10),
        ...buildProfileUpdate(),
      };

      // Persist the Google avatar URL so the profile screen can display it
      if (googleAvatarUrl && !profileUpdate.profile_picture) {
        profileUpdate.profile_picture = googleAvatarUrl;
      }

     const { data: updatedProfile, error } = await supabase
      .from('users')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email ?? '',
          ...profileUpdate,
        },
        {
          onConflict: 'id',
        }
      )
      .select('id')
      .single();

      if (error) {
        throw error;
      }
      if (!updatedProfile) {
        throw new Error(
          'Your profile could not be found. Please sign in again or contact support.',
        );
      }

      // Clean up the cached prefill now that it's been used
      await AsyncStorage.multiRemove([
      'google_prefill_profile',
      'facebook_prefill_profile',
    ]).catch(() => {});

      onGoogleComplete?.();
    } catch (err: any) {
      Alert.alert(
        'Unable to Save Details',
        err?.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Sign Up
  // ───────────────────────────────────────────────────────────

  const handleSignUp = async () => {
    if (!validateStep3()) return;

    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      const {
        Address: address,
        province: dbProvince,
        city: dbCity,
        barangay: dbBarangay,
      } = buildProfileUpdate();

      // Resize profile image before storing pending profile
      const resizedUri = profilePicUri
        ? (
            await ImageManipulator.manipulateAsync(
              profilePicUri,
              [{ resize: { width: 400, height: 400 } }],
              {
                compress: 0.82,
                format: ImageManipulator.SaveFormat.JPEG,
              },
            )
          ).uri
        : null;

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,

        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            gender,
            age: parseInt(age, 10),
            Address: address,
            country: location.country,
            province: dbProvince,
            city: dbCity,
            barangay: dbBarangay,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Supabase returns no error but an empty identities array when the
      // email is already registered (email-confirmation flow). Detect it
      // here so the user gets a clear message instead of silently landing
      // on the OTP screen with no code ever sent.
      if (
        signUpData?.user &&
        Array.isArray(signUpData.user.identities) &&
        signUpData.user.identities.length === 0
      ) {
        throw new Error(
          'This email is already registered. Please sign in or use a different email address.',
        );
      }

      await savePendingProfile({
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: gender as Gender,
        age: parseInt(age, 10),
        address,
        country: location.country,
        province: dbProvince,
        city: dbCity,
        barangay: dbBarangay,
        profilePicUri: resizedUri,
      });

      await AsyncStorage.setItem(
        `otp_sent_at_${normalizedEmail}`,
        Date.now().toString(),
      );

      // FIX: if Supabase returned a confirmed session (email confirmation
      // disabled / auto-confirmed), AuthNavigator has already moved on and
      // the VerifyOTP screen no longer exists. Don't navigate manually.
      if (signUpData?.session) {
        return;
      }

      navigation.navigate('VerifyOTP', {
        email: normalizedEmail,
      });
    } catch (err: any) {
      const raw: string = err?.message ?? '';

      // Translate Supabase's internal email-sending error into something
      // the user can actually act on.
      let userMessage: string;
      if (
        raw.toLowerCase().includes('error sending confirmation email') ||
        (raw.toLowerCase().includes('email') &&
          raw.toLowerCase().includes('rate limit')) ||
        raw.toLowerCase().includes('over_email_send_rate_limit')
      ) {
        userMessage =
          "We couldn't send your verification email right now. " +
          'This is usually a temporary issue — please wait a moment and try again. ' +
          'If it keeps happening, try a different email address.';
      } else if (raw.toLowerCase().includes('already registered')) {
        userMessage = raw; // already a friendly message from the identities check
      } else {
        userMessage = raw || 'Something went wrong. Please try again.';
      }

      Alert.alert('Unable to Create Account', userMessage);
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  const totalSteps = googleMode ? 2 : 3;

  const stepTitles = googleMode
    ? ['Complete your profile', 'Where are you from?']
    : ['Create your account', 'Where are you from?', 'Secure your account'];

  const stepSubtitles = [
    googleMode
      ? 'Tell us a little about yourself.'
      : 'Join ETurismo and discover heritage.',

    'Help us personalise your experience.',

    'Set up your email and password.',
  ];

  const goBack = () => {
    setErrors({});
    setStep(v => Math.max(1, v - 1));
  };

  return (
    <View style={s.screen}>
      <StatusBar style="light" />

      <Image source={require('../../assets/Signin.jpg')} style={s.bg} />

      <View style={s.bgOverlay} />
      <View style={s.bgOverlayBottom} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            {
              paddingTop: insets.top + 14,
              paddingBottom: insets.bottom + 14,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand — sits on the hero image, above the card */}

          <View style={s.brand}>
            <View style={s.logoCircle}>
              <Icon name="map-outline" size={18} color={C.goldLight} />
            </View>

            <Text style={s.brandName}>ETurismo</Text>

            <View style={s.brandSubRow}>
              <View style={s.brandSubLine} />
              <Text style={s.brandSub}>HERITAGE • CULTURE • JOURNEY</Text>
              <View style={s.brandSubLine} />
            </View>
          </View>

          <View style={s.card}>
            <View style={s.cardAccent} />

            {/* Card header: back + step counter */}

            <View style={s.cardHeader}>
              {step > 1 ? (
                <TouchableOpacity
                  style={s.headerBack}
                  onPress={goBack}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="chevron-back" size={18} color={C.ink} />
                </TouchableOpacity>
              ) : (
                <View style={s.headerBackSpacer} />
              )}

              <Text style={s.stepCounter}>
                STEP {step} OF {totalSteps}
              </Text>
            </View>

            {/* Title */}

            <Text style={s.title}>{stepTitles[step - 1]}</Text>

            <Text style={s.subtitle}>{stepSubtitles[step - 1]}</Text>

            <StepBar step={step} googleMode={googleMode} />

            <Animated.View
              style={{
                opacity: stepAnim,
                transform: [
                  {
                    translateY: stepAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              }}
            >
              {/* STEP 1 */}

              {step === 1 && (
                <View>
                  {/* Show read-only Google avatar in googleMode, picker otherwise */}
                  {googleMode && googleAvatarUrl ? (
                    <View style={s.photoWrap}>
                      <View style={s.photoRow}>
                        <View style={s.avatarWrap}>
                          <Image source={{ uri: googleAvatarUrl }} style={s.avatar} />
                          <View style={[s.camBtn, { backgroundColor: '#4285F4' }]}>
                            <Icon name="logo-google" size={12} color="#fff" />
                          </View>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.photoTitle}>Google profile photo</Text>
                          <Text style={s.photoDesc}>
                            Your Google account photo will be used as your profile picture.
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <ProfilePhoto
                      uri={profilePicUri}
                      onPick={pickPhoto}
                      onRemove={removePhoto}
                    />
                  )}

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="FIRST NAME"
                        icon="person-outline"
                        value={firstName}
                        onChangeText={t => {
                          setFirstName(t);
                          clearError('firstName');
                        }}
                        placeholder="First name"
                        autoCapitalize="words"
                        error={errors.firstName}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Field
                        label="LAST NAME"
                        value={lastName}
                        onChangeText={t => {
                          setLastName(t);
                          clearError('lastName');
                        }}
                        placeholder="Last name"
                        autoCapitalize="words"
                        error={errors.lastName}
                      />
                    </View>
                  </View>

                  <GenderSelector
                    selected={gender}
                    onSelect={v => {
                      setGender(v);
                      clearError('gender');
                    }}
                    error={errors.gender}
                  />

                  <Field
                    label="AGE"
                    icon="calendar-outline"
                    value={age}
                    onChangeText={t => {
                      setAge(t.replace(/[^0-9]/g, ''));
                      clearError('age');
                    }}
                    placeholder="Your age"
                    keyboardType="numeric"
                    maxLength={3}
                    error={errors.age}
                  />

                  <TouchableOpacity
                    style={s.mainBtn}
                    onPress={() => {
                      if (validateStep1()) {
                        setErrors({});
                        setStep(2);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.mainBtnTxt}>Continue</Text>

                    <Icon name="arrow-forward" size={18} color={C.white} />
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2 */}

              {step === 2 && (
                <View>
                  <LocationFields
                    value={location}
                    onChange={v => {
                      setLocation(v);
                      clearError('location');
                    }}
                    error={errors.location}
                  />

                  <TouchableOpacity
                    style={[s.mainBtn, loading && { opacity: 0.55 }]}
                    onPress={() => {
                      if (googleMode) {
                        handleGoogleProfile();
                      } else if (validateStep2()) {
                        setErrors({});
                        setStep(3);
                      }
                    }}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {googleMode && loading ? (
                      <ActivityIndicator size="small" color={C.white} />
                    ) : (
                      <>
                        <Text style={s.mainBtnTxt}>
                          {googleMode ? 'Complete Profile' : 'Continue'}
                        </Text>

                        <Icon
                          name={
                            googleMode
                              ? 'checkmark-circle-outline'
                              : 'arrow-forward'
                          }
                          size={18}
                          color={C.white}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3 */}

              {step === 3 && !googleMode && (
                <View>
                  <Field
                    label="EMAIL ADDRESS"
                    icon="mail-outline"
                    value={email}
                    onChangeText={t => {
                      setEmail(t);
                      clearError('email');
                    }}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    error={errors.email}
                  />

                  <Field
                    label="PASSWORD"
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={t => {
                      setPassword(t);
                      clearError('password');
                    }}
                    placeholder="At least 8 characters"
                    secure
                    showToggle
                    error={errors.password}
                  />

                  <PasswordStrength password={password} />

                  <TermsCheckbox
                    checked={termsAccepted}
                    onToggle={() => {
                      setTermsAccepted(v => !v);
                      clearError('terms');
                    }}
                    error={errors.terms}
                  />

                  <TouchableOpacity
                    style={[s.mainBtn, loading && { opacity: 0.55 }]}
                    onPress={handleSignUp}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={C.white} />
                    ) : (
                      <>
                        <Text style={s.mainBtnTxt}>Create Account</Text>

                        <Icon
                          name="checkmark-circle-outline"
                          size={19}
                          color={C.white}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>

            {/* Footer
                FIX: in Google mode the "SignIn" screen isn't registered
                (only "GoogleProfile" is), so navigate('SignIn') throws.
                Signing out instead makes AuthNavigator switch back to the
                auth phase, which shows SignIn. */}

            <View style={s.footer}>
              {!googleMode && (
                <Text style={s.footerTxt}>Already have an account?</Text>
              )}

              <TouchableOpacity
                onPress={() =>
                  googleMode
                    ? supabase.auth.signOut()
                    : navigation.navigate('SignIn')
                }
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.footerLink}>
                  {googleMode ? 'Use a different account' : ' Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.security}>
            <Icon name="shield-checkmark-outline" size={14} color={C.goldLight} />

            <Text style={s.securityTxt}>
              Your information is securely protected
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.ink,
  },

  bg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  bgOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(20,17,12,0.55)',
  },

  bgOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: 'rgba(20,17,12,0.25)',
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  // Brand (on hero)

  brand: {
    alignItems: 'center',
    marginBottom: 12,
  },

  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(216,189,122,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  brandName: {
    color: C.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  brandSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },

  brandSubLine: {
    width: 14,
    height: 1,
    backgroundColor: C.goldLight,
    opacity: 0.7,
  },

  brandSub: {
    color: C.goldLight,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Card

  card: {
    width: SCREEN_WIDTH > 600 ? 420 : '100%',

    backgroundColor: C.card,
    borderRadius: 20,
    overflow: 'hidden',

    paddingHorizontal: SCREEN_WIDTH > 600 ? 28 : 16,

    paddingTop: 14,
    paddingBottom: 14,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 14,
    },

    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 14,
  },

  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: C.gold,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 2,
  },

  headerBack: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBackSpacer: {
    width: 28,
    height: 28,
  },

  stepCounter: {
    color: C.gold,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.6,
  },

  // Title

  title: {
    color: C.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    color: C.inkMid,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 12,
  },

  // Step bar

  stepBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  stepItem: {
    flex: 1,
  },

  stepSeg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.border,
  },

  stepSegOn: {
    backgroundColor: C.gold,
  },

  stepSegActive: {
    backgroundColor: C.goldDeep,
  },

  stepLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },

  stepLabel: {
    color: C.inkLight,
    fontSize: 9,
    fontWeight: '700',
  },

  stepLabelOn: {
    color: C.goldDeep,
  },

  // Input

  fieldWrap: {
    marginBottom: 10,
  },

  label: {
    color: C.inkMid,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 5,
  },

  inputBox: {
    minHeight: 42,
    backgroundColor: C.field,
    borderWidth: 1.4,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  inputBoxFocused: {
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },

  leadIcon: {
    marginLeft: 11,
  },

  input: {
    flex: 1,
    color: C.ink,
    fontSize: 13,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 7,
  },

  eyeBtn: {
    position: 'absolute',
    right: 8,
    padding: 8,
  },

  errRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },

  errTxt: {
    color: C.error,
    fontSize: 10.5,
    fontWeight: '500',
    flexShrink: 1,
  },

  // Password strength

  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -6,
    marginBottom: 14,
  },

  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },

  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
  },

  strengthTxt: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 58,
    textAlign: 'right',
  },

  // Gender

  segment: {
    flexDirection: 'row',
    gap: 8,
  },

  genderBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1.4,
    borderColor: C.border,
    borderRadius: 11,
    backgroundColor: C.field,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  genderBtnActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },

  genderTxt: {
    color: C.inkMid,
    fontSize: 12,
    fontWeight: '700',
  },

  genderTxtActive: {
    color: C.white,
  },

  // Photo

  photoWrap: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.goldSoft,
  },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrap: {
    width: 58,
    height: 58,
    position: 'relative',
    marginRight: 10,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: C.gold,
    backgroundColor: C.goldSoft,
  },

  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.goldLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  camBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.ink,
    borderWidth: 2,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoTitle: {
    color: C.ink,
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 2,
  },

  photoDesc: {
    color: C.inkMid,
    fontSize: 10,
    lineHeight: 13,
  },

  photoBtn: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  photoBtnTxt: {
    color: C.ink,
    fontSize: 10.5,
    fontWeight: '800',
  },

  removeBtn: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: C.errorLight,
    borderWidth: 1,
    borderColor: '#F0D4D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  removeBtnTxt: {
    color: C.error,
    fontSize: 10.5,
    fontWeight: '800',
  },

  // Terms

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
    borderRadius: 11,
    borderWidth: 1.2,
    borderColor: C.border,
    backgroundColor: C.field,
  },

  termsRowErr: {
    borderColor: C.error,
    backgroundColor: C.errorLight,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.6,
    borderColor: C.inkLight,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  checkboxOn: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },

  checkboxErr: {
    borderColor: C.error,
  },

  termsTxt: {
    color: C.inkMid,
    fontSize: 11.5,
    flexShrink: 1,
  },

  termsLink: {
    color: C.goldDeep,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  // Buttons

  mainBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    borderBottomWidth: 3,
    borderBottomColor: C.gold,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },

  mainBtnTxt: {
    color: C.white,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Footer

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 12,
    paddingTop: 12,
  },

  footerTxt: {
    color: C.inkMid,
    fontSize: 11.5,
  },

  footerLink: {
    color: C.goldDeep,
    fontSize: 11.5,
    fontWeight: '900',
  },

  security: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },

  securityTxt: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
  },
});
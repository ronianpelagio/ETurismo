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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
  background: '#F6F2EA',
  card: '#FFFFFF',
  ink: '#191611',
  inkSoft: '#302A22',
  inkMid: '#6E665B',
  inkLight: '#A59C90',
  gold: '#B99345',
  goldLight: '#D8BD7A',
  goldSoft: '#F5ECD9',
  border: '#E5DED2',
  borderFocus: '#B99345',
  error: '#B63B32',
  errorLight: '#FFF1EF',
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

  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>

      <Animated.View style={[s.inputBox, { borderColor }]}>
        <TextInput
          style={[s.input, showToggle && { paddingRight: 44 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.inkLight}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secure && !show}
          onFocus={() => animBorder(1)}
          onBlur={() => animBorder(0)}
        />

        {showToggle && (
          <TouchableOpacity
            style={s.eyeBtn}
            onPress={() => setShow(v => !v)}
            activeOpacity={0.7}
          >
            <Icon
              name={show ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={C.inkLight}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {error ? (
        <View style={s.errRow}>
          <Icon name="alert-circle-outline" size={12} color={C.error} />
          <Text style={s.errTxt}>{error}</Text>
        </View>
      ) : null}
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
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>GENDER</Text>

      <View style={{ flexDirection: 'row', gap: 7 }}>
        {(['Male', 'Female', 'Other'] as Gender[]).map(opt => {
          const active = selected === opt;

          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onSelect(opt)}
              activeOpacity={0.8}
              style={[s.genderBtn, active && s.genderBtnActive]}
            >
              {active && <Icon name="checkmark" size={13} color={C.white} />}

              <Text style={[s.genderTxt, active && s.genderTxtActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View style={s.errRow}>
          <Icon name="alert-circle-outline" size={12} color={C.error} />
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
        <View style={s.avatarWrap}>
          {uri ? (
            <Image source={{ uri }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Icon name="person-outline" size={30} color={C.inkLight} />
            </View>
          )}

          <TouchableOpacity
            style={s.camBtn}
            onPress={onPick}
            activeOpacity={0.8}
          >
            <Icon
              name={uri ? 'create-outline' : 'camera-outline'}
              size={14}
              color={C.white}
            />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.photoTitle}>
            {uri ? 'Photo selected' : 'Add profile photo'}
          </Text>

          <Text style={s.photoDesc}>
            Optional · JPG or PNG · Add later if you prefer.
          </Text>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <TouchableOpacity
              style={s.photoBtn}
              onPress={onPick}
              activeOpacity={0.8}
            >
              <Icon name="image-outline" size={13} color={C.ink} />
              <Text style={s.photoBtnTxt}>{uri ? 'Change' : 'Choose'}</Text>
            </TouchableOpacity>

            {uri && (
              <TouchableOpacity
                style={s.removeBtn}
                onPress={onRemove}
                activeOpacity={0.8}
              >
                <Icon name="trash-outline" size={13} color={C.error} />
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
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center' }}
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
          {checked && <Icon name="checkmark" size={12} color={C.white} />}
        </View>

        <Text style={s.termsTxt}>
          I agree to the{' '}
          <Text style={s.termsLink}>Terms & Privacy</Text>
        </Text>
      </TouchableOpacity>

      {error ? (
        <View style={s.errRow}>
          <Icon name="alert-circle-outline" size={12} color={C.error} />
          <Text style={s.errTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Step Indicator
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
          <React.Fragment key={n}>
            <View style={s.stepItem}>
              <View
                style={[s.stepCircle, (active || done) && s.stepCircleOn]}
              >
                {done ? (
                  <Icon name="checkmark" size={12} color={C.white} />
                ) : (
                  <Text style={[s.stepNum, (active || done) && s.stepNumOn]}>
                    {n}
                  </Text>
                )}
              </View>

              <Text style={[s.stepLabel, active && s.stepLabelOn]}>
                {label}
              </Text>
            </View>

            {i < labels.length - 1 && <View style={s.stepLine} />}
          </React.Fragment>
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

  // ───────────────────────────────────────────────────────────
  // Google profile
  // ───────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!googleMode) return;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data.user?.email) {
          setEmail(data.user.email);
        }

        const metadata = data.user?.user_metadata ?? {};

        if (metadata.first_name) {
          setFirstName(metadata.first_name);
        }

        if (metadata.last_name) {
          setLastName(metadata.last_name);
        }
      })
      .catch(() => {});
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

      if (isNaN(n) || n < 1 || n > 120) {
        e.age = 'Enter a valid age';
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
      if (!location.province || !location.city || !location.barangay) {
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
          'Your Google session has expired. Please sign in again.',
        );
      }

      const profileUpdate = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        age: parseInt(age, 10),
        ...buildProfileUpdate(),
      };

      const { error } = await supabase
        .from('users')
        .update(profileUpdate)
        .eq('id', authUser.id);

      if (error) {
        throw error;
      }

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

  return (
    <View style={s.screen}>
      <StatusBar style="light" />

      <Image source={require('../../assets/Signin.jpg')} style={s.bg} />

      <View style={s.bgOverlay} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>
            {/* Brand */}

            <View style={s.brand}>
              <View style={s.logoCircle}>
                <Icon name="map-outline" size={20} color={C.gold} />
              </View>

              <Text style={s.brandName}>ETurismo</Text>

              <Text style={s.brandSub}>HERITAGE • CULTURE • JOURNEY</Text>
            </View>

            <View style={s.divider} />

            {/* Title */}

            <Text style={s.title}>{stepTitles[step - 1]}</Text>

            <Text style={s.subtitle}>{stepSubtitles[step - 1]}</Text>

            <StepBar step={step} googleMode={googleMode} />

            {/* STEP 1 */}

            {step === 1 && (
              <View>
                <ProfilePhoto
                  uri={profilePicUri}
                  onPick={pickPhoto}
                  onRemove={removePhoto}
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="FIRST NAME"
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

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 2 }}>
                    <GenderSelector
                      selected={gender}
                      onSelect={v => {
                        setGender(v);
                        clearError('gender');
                      }}
                      error={errors.gender}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Field
                      label="AGE"
                      value={age}
                      onChangeText={t => {
                        setAge(t.replace(/[^0-9]/g, ''));
                        clearError('age');
                      }}
                      placeholder="Age"
                      keyboardType="numeric"
                      error={errors.age}
                    />
                  </View>
                </View>

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

                  <Icon name="arrow-forward" size={17} color={C.white} />
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
                        size={17}
                        color={C.white}
                      />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => {
                    setErrors({});
                    setStep(1);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="arrow-back" size={14} color={C.inkMid} />

                  <Text style={s.backBtnTxt}>Back to personal details</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3 */}

            {step === 3 && !googleMode && (
              <View>
                <Field
                  label="EMAIL ADDRESS"
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
                        size={18}
                        color={C.white}
                      />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => {
                    setErrors({});
                    setStep(2);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="arrow-back" size={14} color={C.inkMid} />

                  <Text style={s.backBtnTxt}>Back to location</Text>
                </TouchableOpacity>
              </View>
            )}

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
              >
                <Text style={s.footerLink}>
                  {googleMode ? 'Use a different account' : ' Sign In'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.security}>
              <Icon name="shield-checkmark-outline" size={13} color={C.gold} />

              <Text style={s.securityTxt}>
                Your information is securely protected
              </Text>
            </View>
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
    backgroundColor: C.background,
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
    backgroundColor: 'rgba(20,17,12,0.63)',
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  card: {
    width: SCREEN_WIDTH > 600 ? 430 : '100%',

    backgroundColor: C.card,
    borderRadius: 20,

    paddingHorizontal: SCREEN_WIDTH > 600 ? 32 : 20,

    paddingTop: 22,
    paddingBottom: 20,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 11,
  },

  // Brand

  brand: {
    alignItems: 'center',
    marginBottom: 2,
  },

  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: '#E3D3B1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  brandName: {
    color: C.ink,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 3.2,
  },

  brandSub: {
    color: C.gold,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginTop: 3,
  },

  divider: {
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.gold,
    alignSelf: 'center',
    marginVertical: 12,
  },

  // Title

  title: {
    color: C.ink,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  subtitle: {
    color: C.inkMid,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },

  // Step bar

  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  stepItem: {
    alignItems: 'center',
  },

  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepCircleOn: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },

  stepNum: {
    color: C.inkLight,
    fontSize: 10,
    fontWeight: '800',
  },

  stepNumOn: {
    color: C.white,
  },

  stepLabel: {
    color: C.inkLight,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 3,
  },

  stepLabelOn: {
    color: C.gold,
  },

  stepLine: {
    width: 48,
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 8,
    marginBottom: 14,
  },

  // Input

  fieldWrap: {
    marginBottom: 9,
  },

  label: {
    color: C.inkMid,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  inputBox: {
    minHeight: 45,
    backgroundColor: C.card,
    borderWidth: 1.3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  input: {
    flex: 1,
    color: C.ink,
    fontSize: 13,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },

  eyeBtn: {
    position: 'absolute',
    right: 10,
    padding: 6,
  },

  errRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },

  errTxt: {
    color: C.error,
    fontSize: 10,
  },

  // Gender

  genderBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1.3,
    borderColor: C.border,
    borderRadius: 9,
    backgroundColor: C.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  genderBtnActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },

  genderTxt: {
    color: C.inkMid,
    fontSize: 11,
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
    borderRadius: 12,
    backgroundColor: '#FCFAF6',
  },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrap: {
    width: 68,
    height: 68,
    position: 'relative',
    marginRight: 12,
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: C.gold,
    backgroundColor: C.goldSoft,
  },

  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.goldSoft,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  camBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.ink,
    borderWidth: 2,
    borderColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoTitle: {
    color: C.ink,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },

  photoDesc: {
    color: C.inkLight,
    fontSize: 9,
    lineHeight: 13,
  },

  photoBtn: {
    height: 29,
    paddingHorizontal: 9,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  photoBtnTxt: {
    color: C.ink,
    fontSize: 9,
    fontWeight: '800',
  },

  removeBtn: {
    height: 29,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: C.errorLight,
    borderWidth: 1,
    borderColor: '#F0D4D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  removeBtnTxt: {
    color: C.error,
    fontSize: 9,
    fontWeight: '800',
  },

  // Terms

  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
    fontSize: 10.5,
    flexShrink: 1,
  },

  termsLink: {
    color: C.gold,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  // Buttons

  mainBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },

  mainBtnTxt: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  backBtn: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  backBtnTxt: {
    color: C.inkMid,
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Footer

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 14,
    paddingTop: 12,
  },

  footerTxt: {
    color: C.inkMid,
    fontSize: 10.5,
  },

  footerLink: {
    color: C.gold,
    fontSize: 10.5,
    fontWeight: '900',
  },

  security: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },

  securityTxt: {
    color: C.inkLight,
    fontSize: 8.5,
  },
});
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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

import { supabase } from '../../services/supabase';
import {
  createOTP,
  sendOTPEmail,
} from '../../services/emailService';

import { Ionicons as Icon } from '@expo/vector-icons';

/* ============================================================================
   ETURISMO THEME
============================================================================ */

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

const { width: SCREEN_WIDTH } =
  Dimensions.get('window');

/* ============================================================================
   TYPES
============================================================================ */

type Gender =
  | 'Male'
  | 'Female'
  | 'Other';

/* ============================================================================
   INPUT FIELD
============================================================================ */

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;

  keyboardType?: any;
  autoCapitalize?: any;

  secure?: boolean;
  showToggle?: boolean;

  error?: string;
}

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
}: FieldProps) {
  const [showPassword, setShowPassword] =
    useState(false);

  const animation =
    useRef(new Animated.Value(0)).current;

  const animateBorder = (
    value: number
  ) => {
    Animated.timing(animation, {
      toValue: value,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const borderColor =
    animation.interpolate({
      inputRange: [0, 1],
      outputRange: [
        error ? C.error : C.border,
        error ? C.error : C.borderFocus,
      ],
    });

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            showToggle && {
              paddingRight: 50,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.inkLight}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={
            secure && !showPassword
          }
          onFocus={() =>
            animateBorder(1)
          }
          onBlur={() =>
            animateBorder(0)
          }
        />

        {showToggle && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() =>
              setShowPassword(
                value => !value
              )
            }
            activeOpacity={0.7}
          >
            <Icon
              name={
                showPassword
                  ? 'eye-outline'
                  : 'eye-off-outline'
              }
              size={19}
              color={C.inkLight}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {error && (
        <View style={styles.errorRow}>
          <Icon
            name="alert-circle-outline"
            size={13}
            color={C.error}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}
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
  onSelect: (gender: Gender) => void;
  error?: string;
}) {
  const options: Gender[] = [
    'Male',
    'Female',
    'Other',
  ];

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        GENDER
      </Text>

      <View style={styles.genderRow}>
        {options.map(option => {
          const active =
            selected === option;

          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.genderButton,
                active &&
                  styles.genderButtonActive,
              ]}
              onPress={() =>
                onSelect(option)
              }
              activeOpacity={0.8}
            >
              {active && (
                <Icon
                  name="checkmark"
                  size={14}
                  color={C.white}
                />
              )}

              <Text
                style={[
                  styles.genderText,
                  active &&
                    styles.genderTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && (
        <View style={styles.errorRow}>
          <Icon
            name="alert-circle-outline"
            size={13}
            color={C.error}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ============================================================================
   PROFILE PHOTO
============================================================================ */

interface ProfilePhotoProps {
  uri: string | null;
  onPick: () => void;
  onRemove: () => void;
}

function ProfilePhoto({
  uri,
  onPick,
  onRemove,
}: ProfilePhotoProps) {
  return (
    <View style={styles.profileSection}>
      <Text style={styles.fieldLabel}>
        PROFILE PHOTO
      </Text>

      <View style={styles.profileContent}>
        <View style={styles.avatarWrapper}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon
                name="person-outline"
                size={34}
                color={C.inkLight}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.cameraButton}
            onPress={onPick}
            activeOpacity={0.8}
          >
            <Icon
              name={
                uri
                  ? 'create-outline'
                  : 'camera-outline'
              }
              size={16}
              color={C.white}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileTitle}>
            {uri
              ? 'Profile photo selected'
              : 'Add a profile photo'}
          </Text>

          <Text style={styles.profileDescription}>
            {uri
              ? 'You can change your photo anytime.'
              : 'A profile photo is optional.'}
          </Text>

          <View style={styles.profileActions}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={onPick}
              activeOpacity={0.8}
            >
              <Icon
                name="image-outline"
                size={15}
                color={C.ink}
              />

              <Text style={styles.photoButtonText}>
                {uri
                  ? 'Change'
                  : 'Choose Photo'}
              </Text>
            </TouchableOpacity>

            {uri && (
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={onRemove}
                activeOpacity={0.8}
              >
                <Icon
                  name="trash-outline"
                  size={15}
                  color={C.error}
                />

                <Text style={styles.removePhotoText}>
                  Remove
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
   TERMS CHECKBOX
============================================================================ */

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
    <View style={styles.termsContainer}>
      <TouchableOpacity
        style={styles.termsRow}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            checked &&
              styles.checkboxChecked,
            error &&
              styles.checkboxError,
          ]}
        >
          {checked && (
            <Icon
              name="checkmark"
              size={13}
              color={C.white}
            />
          )}
        </View>

        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.termsLink}>
            Terms & Privacy
          </Text>
        </Text>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorRow}>
          <Icon
            name="alert-circle-outline"
            size={13}
            color={C.error}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ============================================================================
   MAIN SIGN UP SCREEN
============================================================================ */

export default function SignUp({
  navigation,
}: any) {
  const [step, setStep] =
    useState(1);

  /* --------------------------------------------------------------------------
     PERSONAL DETAILS
  -------------------------------------------------------------------------- */

  const [firstName, setFirstName] =
    useState('');

  const [lastName, setLastName] =
    useState('');

  const [gender, setGender] =
    useState<Gender | ''>('');

  const [age, setAge] =
    useState('');

  const [address, setAddress] =
    useState('');

  const [profilePicUri, setProfilePicUri] =
    useState<string | null>(null);

  /* --------------------------------------------------------------------------
     ACCOUNT DETAILS
  -------------------------------------------------------------------------- */

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  /* --------------------------------------------------------------------------
     GENERAL
  -------------------------------------------------------------------------- */

  const [loading, setLoading] =
    useState(false);

  const [errors, setErrors] =
    useState<
      Record<string, string>
    >({});

  /* ==========================================================================
     PICK PROFILE PHOTO
  ========================================================================== */

  const pickProfilePhoto = () => {
    Alert.alert(
      'Profile Photo',
      'Choose how you want to add your profile photo.',
      [
        {
          text: 'Camera',
          onPress: openCamera,
        },
        {
          text: 'Photo Library',
          onPress: openGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  /* ==========================================================================
     CAMERA
  ========================================================================== */

  const openCamera = async () => {
    const { status } =
      await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission',
        'Please allow camera access to take a profile photo.'
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.85,
      });

    if (
      !result.canceled &&
      result.assets?.length
    ) {
      setProfilePicUri(
        result.assets[0].uri
      );
    }
  };

  /* ==========================================================================
     GALLERY
  ========================================================================== */

  const openGallery = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'Please allow photo library access to choose a profile photo.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.85,
      });

    if (
      !result.canceled &&
      result.assets?.length
    ) {
      setProfilePicUri(
        result.assets[0].uri
      );
    }
  };

  /* ==========================================================================
     REMOVE PHOTO
  ========================================================================== */

  const removeProfilePhoto = () => {
    Alert.alert(
      'Remove Profile Photo',
      'Are you sure you want to remove your profile photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            setProfilePicUri(null),
        },
      ]
    );
  };

  /* ==========================================================================
     VALIDATE STEP 1
  ========================================================================== */

  const validateStep1 = () => {
    const newErrors: Record<
      string,
      string
    > = {};

    if (!firstName.trim()) {
      newErrors.firstName =
        'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName =
        'Last name is required';
    }

    if (!gender) {
      newErrors.gender =
        'Please select your gender';
    }

    if (!age.trim()) {
      newErrors.age =
        'Age is required';
    } else {
      const parsedAge =
        parseInt(age, 10);

      if (
        isNaN(parsedAge) ||
        parsedAge < 1 ||
        parsedAge > 120
      ) {
        newErrors.age =
          'Enter a valid age';
      }
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors)
        .length === 0
    );
  };

  /* ==========================================================================
     VALIDATE STEP 2
  ========================================================================== */

  const validateStep2 = () => {
    const newErrors: Record<
      string,
      string
    > = {};

    if (!email.trim()) {
      newErrors.email =
        'Email is required';
    } else if (
      !/\S+@\S+\.\S+/.test(
        email
      )
    ) {
      newErrors.email =
        'Enter a valid email address';
    }

    if (!password) {
      newErrors.password =
        'Password is required';
    } else if (
      password.length < 8
    ) {
      newErrors.password =
        'Password must be at least 8 characters';
    }

    if (!termsAccepted) {
      newErrors.terms =
        'You must accept the Terms & Privacy';
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors)
        .length === 0
    );
  };

  /* ==========================================================================
     CLEAR ERROR
  ========================================================================== */

  const clearError = (
    field: string
  ) => {
    setErrors(previous => ({
      ...previous,
      [field]: '',
    }));
  };

  /* ==========================================================================
     NEXT STEP
  ========================================================================== */

  const goToStep2 = () => {
    if (!validateStep1()) {
      return;
    }

    setErrors({});
    setStep(2);
  };

  /* ==========================================================================
     GO BACK
  ========================================================================== */

  const goBackToStep1 = () => {
    setErrors({});
    setStep(1);
  };

  /* ==========================================================================
     RESIZE PROFILE PHOTO
  ========================================================================== */

  const getResizedProfileUri =
    async (): Promise<
      string | null
    > => {
      if (!profilePicUri) {
        return null;
      }

      const result =
        await ImageManipulator.manipulateAsync(
          profilePicUri,
          [
            {
              resize: {
                width: 400,
                height: 400,
              },
            },
          ],
          {
            compress: 0.82,
            format:
              ImageManipulator.SaveFormat
                .JPEG,
          }
        );

      return result.uri;
    };

  /* ==========================================================================
     SIGN UP
  ========================================================================== */

  const handleSignUp = async () => {
    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail =
        email
          .toLowerCase()
          .trim();

      /* ----------------------------------------------------------------------
         UPLOAD PROFILE PHOTO
      ---------------------------------------------------------------------- */

      let profilePictureUrl:
        string | null = null;

      if (profilePicUri) {
        const resizedUri =
          (await getResizedProfileUri()) ??
          profilePicUri;

        const fileName =
          `${normalizedEmail.replace(
            /[^a-z0-9]/g,
            '_'
          )}_${Date.now()}.jpg`;

        const base64 =
          await FileSystem.readAsStringAsync(
            resizedUri,
            {
              encoding:
                FileSystem.EncodingType
                  .Base64,
            }
          );

        const byteArray =
          Uint8Array.from(
            atob(base64),
            character =>
              character.charCodeAt(
                0
              )
          );

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from(
              'media-Profile'
            )
            .upload(
              fileName,
              byteArray,
              {
                contentType:
                  'image/jpeg',
                upsert: true,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: {
            publicUrl,
          },
        } =
          supabase.storage
            .from(
              'media-Profile'
            )
            .getPublicUrl(
              fileName
            );

        profilePictureUrl =
          publicUrl;
      }

      /* ----------------------------------------------------------------------
         CREATE SUPABASE ACCOUNT
      ---------------------------------------------------------------------- */

      const {
        error,
      } =
        await supabase.auth.signUp({
          email:
            normalizedEmail,

          password,

          options: {
            data: {
              first_name:
                firstName.trim(),

              last_name:
                lastName.trim(),

              gender,

              age:
                parseInt(
                  age,
                  10
                ),

              Address:
                address.trim() ||
                null,

              profile_picture:
                profilePictureUrl,
            },
          },
        });

      if (error) {
        throw error;
      }

      /* ----------------------------------------------------------------------
         CREATE + SEND OTP
      ---------------------------------------------------------------------- */

      const code =
        createOTP(
          normalizedEmail
        );

      await sendOTPEmail(
        normalizedEmail,
        code
      );

      navigation.navigate(
        'VerifyOTP',
        {
          email:
            normalizedEmail,
        }
      );

    } catch (error: any) {
      Alert.alert(
        'Unable to Create Account',
        error?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================================
     UI
  ========================================================================== */

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* ----------------------------------------------------------------------
          BACKGROUND
      ---------------------------------------------------------------------- */}

      <Image
        source={require('../../assets/Signin.jpg')}
        style={styles.backgroundImage}
      />

      <View
        style={styles.backgroundOverlay}
      />

      {/* ----------------------------------------------------------------------
          MAIN
      ---------------------------------------------------------------------- */}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >

          {/* ==================================================================
              LOGIN STYLE CARD
          ================================================================== */}

          <View style={styles.card}>

            {/* --------------------------------------------------------------
                BRAND
            -------------------------------------------------------------- */}

            <View style={styles.brandArea}>

              <View
                style={
                  styles.logoCircle
                }
              >
                <Icon
                  name="map-outline"
                  size={22}
                  color={C.gold}
                />
              </View>

              <Text style={styles.brandName}>
                ETURISMO
              </Text>

              <Text
                style={
                  styles.brandSubtitle
                }
              >
                HERITAGE • CULTURE • JOURNEY
              </Text>

            </View>

            {/* --------------------------------------------------------------
                DIVIDER
            -------------------------------------------------------------- */}

            <View
              style={
                styles.goldDivider
              }
            />

            {/* --------------------------------------------------------------
                TITLE
            -------------------------------------------------------------- */}

            <Text
              style={styles.title}
            >
              {step === 1
                ? 'Create your account'
                : 'Secure your account'}
            </Text>

            <Text
              style={
                styles.description
              }
            >
              {step === 1
                ? 'Join ETURISMO and discover places, culture, and heritage.'
                : 'Set up your email and password to complete registration.'}
            </Text>

            {/* --------------------------------------------------------------
                STEP INDICATOR
            -------------------------------------------------------------- */}

            <View
              style={
                styles.stepIndicator
              }
            >

              <View
                style={
                  styles.stepItem
                }
              >

                <View
                  style={[
                    styles.stepCircle,
                    step >= 1 &&
                      styles.stepCircleActive,
                  ]}
                >
                  {step > 1 ? (
                    <Icon
                      name="checkmark"
                      size={13}
                      color={C.white}
                    />
                  ) : (
                    <Text
                      style={
                        styles.stepNumber
                      }
                    >
                      1
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.stepLabel,
                    step === 1 &&
                      styles.stepLabelActive,
                  ]}
                >
                  Personal
                </Text>

              </View>

              <View
                style={
                  styles.stepLine
                }
              />

              <View
                style={
                  styles.stepItem
                }
              >

                <View
                  style={[
                    styles.stepCircle,
                    step === 2 &&
                      styles.stepCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      step === 2 &&
                        styles.stepNumberActive,
                    ]}
                  >
                    2
                  </Text>
                </View>

                <Text
                  style={[
                    styles.stepLabel,
                    step === 2 &&
                      styles.stepLabelActive,
                  ]}
                >
                  Account
                </Text>

              </View>

            </View>

            {/* ===============================================================
                STEP 1
            ================================================================ */}

            {step === 1 && (
              <View>

                {/* PROFILE PHOTO */}

                <ProfilePhoto
                  uri={
                    profilePicUri
                  }
                  onPick={
                    pickProfilePhoto
                  }
                  onRemove={
                    removeProfilePhoto
                  }
                />

                {/* FIRST / LAST NAME */}

                <View style={styles.nameRow}>
                  <View style={styles.nameColumn}>
                    <Field
                      label="First Name"
                      value={firstName}
                      onChangeText={text => { setFirstName(text); clearError('firstName'); }}
                      placeholder="First name"
                      autoCapitalize="words"
                      error={errors.firstName}
                    />
                  </View>
                  <View style={styles.nameColumn}>
                    <Field
                      label="Last Name"
                      value={lastName}
                      onChangeText={text => { setLastName(text); clearError('lastName'); }}
                      placeholder="Last name"
                      autoCapitalize="words"
                      error={errors.lastName}
                    />
                  </View>
                </View>

                {/* GENDER + AGE — compact row */}

                <View style={styles.nameRow}>
                  <View style={{ flex: 2 }}>
                    <GenderSelector
                      selected={gender}
                      onSelect={value => { setGender(value); clearError('gender'); }}
                      error={errors.gender}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Age"
                      value={age}
                      onChangeText={text => { setAge(text.replace(/[^0-9]/g, '')); clearError('age'); }}
                      placeholder="Age"
                      keyboardType="numeric"
                      error={errors.age}
                    />
                  </View>
                </View>

                {/* ADDRESS — optional, short placeholder */}

                <Field
                  label="Address (optional)"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="City, Province"
                  autoCapitalize="words"
                />

                {/* CONTINUE */}

                <TouchableOpacity
                  style={
                    styles.mainButton
                  }
                  onPress={
                    goToStep2
                  }
                  activeOpacity={0.85}
                >
                  <Text
                    style={
                      styles.mainButtonText
                    }
                  >
                    Continue
                  </Text>

                  <Icon
                    name="arrow-forward"
                    size={18}
                    color={C.white}
                  />
                </TouchableOpacity>

              </View>
            )}

            {/* ===============================================================
                STEP 2
            ================================================================ */}

            {step === 2 && (
              <View>

                {/* EMAIL */}

                <Field
                  label="Email Address"
                  value={email}
                  onChangeText={text => {
                    setEmail(
                      text
                    );
                    clearError(
                      'email'
                    );
                  }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  error={
                    errors.email
                  }
                />

                {/* PASSWORD */}

                <Field
                  label="Password"
                  value={
                    password
                  }
                  onChangeText={text => {
                    setPassword(
                      text
                    );
                    clearError(
                      'password'
                    );
                  }}
                  placeholder="At least 8 characters"
                  secure
                  showToggle
                  error={
                    errors.password
                  }
                />

                {/* TERMS */}

                <TermsCheckbox
                  checked={
                    termsAccepted
                  }
                  onToggle={() => {
                    setTermsAccepted(
                      value => !value
                    );
                    clearError(
                      'terms'
                    );
                  }}
                  error={
                    errors.terms
                  }
                />

                {/* CREATE ACCOUNT */}

                <TouchableOpacity
                  style={[
                    styles.mainButton,
                    loading &&
                      styles.mainButtonDisabled,
                  ]}
                  onPress={
                    handleSignUp
                  }
                  disabled={
                    loading
                  }
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        C.white
                      }
                    />
                  ) : (
                    <>
                      <Text
                        style={
                          styles.mainButtonText
                        }
                      >
                        Create Account
                      </Text>

                      <Icon
                        name="checkmark-circle-outline"
                        size={19}
                        color={
                          C.white
                        }
                      />
                    </>
                  )}
                </TouchableOpacity>

                {/* BACK */}

                <TouchableOpacity
                  style={
                    styles.backButton
                  }
                  onPress={
                    goBackToStep1
                  }
                  activeOpacity={0.7}
                >
                  <Icon
                    name="arrow-back"
                    size={15}
                    color={
                      C.inkMid
                    }
                  />

                  <Text
                    style={
                      styles.backButtonText
                    }
                  >
                    Back to personal details
                  </Text>
                </TouchableOpacity>

              </View>
            )}

            {/* --------------------------------------------------------------
                SIGN IN FOOTER
            -------------------------------------------------------------- */}

            <View
              style={
                styles.footer
              }
            >
              <Text
                style={
                  styles.footerText
                }
              >
                Already have an account?
              </Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'SignIn'
                  )
                }
                activeOpacity={0.7}
              >
                <Text
                  style={
                    styles.footerLink
                  }
                >
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            {/* --------------------------------------------------------------
                SECURITY
            -------------------------------------------------------------- */}

            <View
              style={
                styles.security
              }
            >
              <Icon
                name="shield-checkmark-outline"
                size={14}
                color={C.gold}
              />

              <Text
                style={
                  styles.securityText
                }
              >
                Your information is securely protected
              </Text>
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

const styles =
  StyleSheet.create({

    /* ========================================================================
       SCREEN
    ======================================================================== */

    screen: {
      flex: 1,
      backgroundColor:
        C.background,
    },

    flex: {
      flex: 1,
    },

    backgroundImage: {
      position: 'absolute',

      width: '100%',
      height: '100%',

      resizeMode: 'cover',
    },

    backgroundOverlay: {
      position: 'absolute',

      width: '100%',
      height: '100%',

      backgroundColor:
        'rgba(20, 17, 12, 0.63)',
    },

    scrollContent: {
      flexGrow: 1,

      minHeight:
        Dimensions.get('window').height,

      justifyContent:
        'center',

      alignItems:
        'center',

      paddingVertical: 35,
      paddingHorizontal: 18,
    },

    /* ========================================================================
       CARD
    ======================================================================== */

    card: {
      width:
        SCREEN_WIDTH > 600
          ? 430
          : '100%',

      backgroundColor:
        C.card,

      borderRadius: 22,

      paddingHorizontal:
        SCREEN_WIDTH > 600
          ? 35
          : 23,

      paddingTop: 27,

      paddingBottom: 24,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 12,
      },

      shadowOpacity: 0.23,

      shadowRadius: 25,

      elevation: 12,
    },

    /* ========================================================================
       BRAND
    ======================================================================== */

    brandArea: {
      alignItems:
        'center',
    },

    logoCircle: {
      width: 47,
      height: 47,

      borderRadius: 24,

      backgroundColor:
        C.goldSoft,

      borderWidth: 1,

      borderColor:
        '#E3D3B1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 9,
    },

    brandName: {
      color:
        C.ink,

      fontSize: 21,

      fontWeight: '900',

      letterSpacing: 3.5,
    },

    brandSubtitle: {
      color:
        C.gold,

      fontSize: 7,

      fontWeight: '800',

      letterSpacing: 1.5,

      marginTop: 4,
    },

    goldDivider: {
      width: 32,
      height: 3,

      borderRadius: 2,

      backgroundColor:
        C.gold,

      alignSelf:
        'center',

      marginTop: 15,
      marginBottom: 15,
    },

    /* ========================================================================
       TITLE
    ======================================================================== */

    title: {
      color:
        C.ink,

      fontSize: 24,

      fontWeight: '800',

      textAlign:
        'center',

      letterSpacing: -0.5,
    },

    description: {
      color:
        C.inkMid,

      fontSize: 11.5,

      lineHeight: 17,

      textAlign:
        'center',

      marginTop: 6,

      marginHorizontal: 10,

      marginBottom: 17,
    },

    /* ========================================================================
       STEP INDICATOR
    ======================================================================== */

    stepIndicator: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 21,
    },

    stepItem: {
      alignItems:
        'center',
    },

    stepCircle: {
      width: 27,
      height: 27,

      borderRadius: 14,

      borderWidth: 1.5,

      borderColor:
        C.border,

      backgroundColor:
        C.card,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    stepCircleActive: {
      backgroundColor:
        C.ink,

      borderColor:
        C.ink,
    },

    stepNumber: {
      color:
        C.inkLight,

      fontSize: 10,

      fontWeight: '800',
    },

    stepNumberActive: {
      color:
        C.white,
    },

    stepLabel: {
      color:
        C.inkLight,

      fontSize: 8.5,

      fontWeight: '700',

      marginTop: 4,
    },

    stepLabelActive: {
      color:
        C.gold,
    },

    stepLine: {
      width: 60,
      height: 1,

      backgroundColor:
        C.border,

      marginHorizontal: 10,

      marginBottom: 16,
    },

    /* ========================================================================
       INPUTS
    ======================================================================== */

    fieldContainer: {
      marginBottom: 10,
    },

    fieldLabel: {
      color:
        C.inkMid,

      fontSize: 9,

      fontWeight: '800',

      letterSpacing: 1.25,

      marginBottom: 6,
    },

    inputContainer: {
      minHeight: 47,

      backgroundColor:
        C.card,

      borderWidth: 1.3,

      borderColor:
        C.border,

      borderRadius: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      overflow: 'hidden',
    },

    input: {
      flex: 1,

      color:
        C.ink,

      fontSize: 13.5,

      paddingHorizontal: 14,

      paddingVertical:
        Platform.OS === 'ios'
          ? 13
          : 9,
    },

    eyeButton: {
      position: 'absolute',

      right: 10,

      padding: 6,
    },

    errorRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,

      marginTop: 4,
    },

    errorText: {
      color:
        C.error,

      fontSize: 10,
    },

    /* ========================================================================
       NAME ROW
    ======================================================================== */

    nameRow: {
      flexDirection:
        'row',

      gap: 10,
    },

    nameColumn: {
      flex: 1,
    },

    /* ========================================================================
       GENDER
    ======================================================================== */

    genderRow: {
      flexDirection:
        'row',

      gap: 7,
    },

    genderButton: {
      flex: 1,

      height: 43,

      borderWidth: 1.3,

      borderColor:
        C.border,

      borderRadius: 9,

      backgroundColor:
        C.card,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 4,
    },

    genderButtonActive: {
      backgroundColor:
        C.ink,

      borderColor:
        C.ink,
    },

    genderText: {
      color:
        C.inkMid,

      fontSize: 11.5,

      fontWeight: '700',
    },

    genderTextActive: {
      color:
        C.white,
    },

    /* ========================================================================
       PROFILE PHOTO
    ======================================================================== */

    profileSection: {
      marginTop: 1,

      marginBottom: 12,

      padding: 10,

      borderWidth: 1,

      borderColor:
        C.border,

      borderRadius: 12,

      backgroundColor:
        '#FCFAF6',
    },

    profileContent: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    avatarWrapper: {
      width: 76,
      height: 76,

      position: 'relative',

      marginRight: 14,
    },

    avatar: {
      width: 76,
      height: 76,

      borderRadius: 38,

      borderWidth: 2,

      borderColor:
        C.gold,

      backgroundColor:
        C.goldSoft,
    },

    avatarPlaceholder: {
      width: 76,
      height: 76,

      borderRadius: 38,

      backgroundColor:
        C.goldSoft,

      borderWidth: 1.5,

      borderColor:
        C.border,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    cameraButton: {
      position: 'absolute',

      right: -3,

      bottom: -2,

      width: 29,
      height: 29,

      borderRadius: 15,

      backgroundColor:
        C.ink,

      borderWidth: 2,

      borderColor:
        C.card,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    profileInfo: {
      flex: 1,
    },

    profileTitle: {
      color:
        C.ink,

      fontSize: 12,

      fontWeight: '800',

      marginBottom: 3,
    },

    profileDescription: {
      color:
        C.inkLight,

      fontSize: 9.5,

      lineHeight: 14,

      marginBottom: 7,
    },

    profileActions: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,
    },

    photoButton: {
      height: 31,

      paddingHorizontal: 10,

      borderRadius: 7,

      borderWidth: 1,

      borderColor:
        C.border,

      backgroundColor:
        C.card,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 5,
    },

    photoButtonText: {
      color:
        C.ink,

      fontSize: 9.5,

      fontWeight: '800',
    },

    removePhotoButton: {
      height: 31,

      paddingHorizontal: 9,

      borderRadius: 7,

      backgroundColor:
        C.errorLight,

      borderWidth: 1,

      borderColor:
        '#F0D4D0',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 4,
    },

    removePhotoText: {
      color:
        C.error,

      fontSize: 9.5,

      fontWeight: '800',
    },

    /* ========================================================================
       TERMS
    ======================================================================== */

    termsContainer: {
      marginTop: 2,

      marginBottom: 8,
    },

    termsRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    checkbox: {
      width: 20,
      height: 20,

      borderRadius: 5,

      borderWidth: 1.5,

      borderColor:
        C.border,

      backgroundColor:
        C.card,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 9,
    },

    checkboxChecked: {
      backgroundColor:
        C.gold,

      borderColor:
        C.gold,
    },

    checkboxError: {
      borderColor:
        C.error,
    },

    termsText: {
      color:
        C.inkMid,

      fontSize: 10.5,

      flexShrink: 1,
    },

    termsLink: {
      color:
        C.gold,

      fontWeight:
        '800',

      textDecorationLine:
        'underline',
    },

    /* ========================================================================
       MAIN BUTTON
    ======================================================================== */

    mainButton: {
      height: 49,

      borderRadius: 10,

      backgroundColor:
        C.ink,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 8,

      marginTop: 6,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.18,

      shadowRadius: 8,

      elevation: 4,
    },

    mainButtonDisabled: {
      opacity: 0.55,
    },

    mainButtonText: {
      color:
        C.white,

      fontSize: 13,

      fontWeight: '800',

      letterSpacing: 0.2,
    },

    /* ========================================================================
       BACK BUTTON
    ======================================================================== */

    backButton: {
      height: 42,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 5,
    },

    backButtonText: {
      color:
        C.inkMid,

      fontSize: 10.5,

      fontWeight: '700',
    },

    /* ========================================================================
       FOOTER
    ======================================================================== */

    footer: {
      flexDirection:
        'row',

      justifyContent:
        'center',

      alignItems:
        'center',

      borderTopWidth: 1,

      borderTopColor:
        C.border,

      marginTop: 17,

      paddingTop: 15,
    },

    footerText: {
      color:
        C.inkMid,

      fontSize: 10.5,
    },

    footerLink: {
      color:
        C.gold,

      fontSize: 10.5,

      fontWeight: '900',

      marginLeft: 5,
    },

    /* ========================================================================
       SECURITY
    ======================================================================== */

    security: {
      flexDirection:
        'row',

      justifyContent:
        'center',

      alignItems:
        'center',

      gap: 5,

      marginTop: 13,
    },

    securityText: {
      color:
        C.inkLight,

      fontSize: 8.5,
    },
  });
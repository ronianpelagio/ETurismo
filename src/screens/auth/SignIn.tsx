import React, { useState } from 'react';
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
  useWindowDimensions,
  ImageBackground,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FontAwesome5 as FAIcon } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { supabase } from '../../services/supabase';

/* ============================================================================
   ETURISMO COLORS
============================================================================ */

const COLORS = {
  black:    '#191611',
  dark:     '#302A22',

  cream:    '#F6F2EA',
  creamDark:'#EEE8DA',

  gold:     '#B99345',
  goldLight:'#D8BD7A',

  text:     '#191611',
  textLight:'#6E665B',
  muted:    '#A59C90',

  white:    '#FFFFFF',

  border:   '#E5DED2',

  error:    '#B63B32',
  errorBg:  '#FFF1EF',

  facebook: '#1877F2',
};

/* ============================================================================
   INPUT FIELD
============================================================================ */

interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;

  icon: ComponentProps<typeof Icon>['name'];

  onChangeText: (text: string) => void;

  secure?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;

  keyboardType?: any;
  autoCapitalize?: any;
  error?: string;
}

function InputField({
  label,
  placeholder,
  value,
  icon,
  onChangeText,
  secure = false,
  showPassword = false,
  onTogglePassword,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        <Icon
          name={icon}
          size={19}
          color={
            focused
              ? COLORS.gold
              : error
              ? COLORS.error
              : COLORS.muted
          }
        />

        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#A8A094"
          onChangeText={onChangeText}
          secureTextEntry={
            secure && !showPassword
          }
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          selectionColor={COLORS.gold}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {secure && onTogglePassword && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <Icon
              name={
                showPassword
                  ? 'eye-outline'
                  : 'eye-off-outline'
              }
              size={19}
              color={COLORS.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.fieldError}>
          <Icon
            name="alert-circle-outline"
            size={14}
            color={COLORS.error}
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
   SOCIAL BUTTON
============================================================================ */

function SocialButton({
  type,
  label,
  onPress,
  loading,
}: {
  type: 'google' | 'facebook';
  label: string;
  onPress: () => void;
  loading: boolean;
}) {
  const isFacebook = type === 'facebook';

  return (
    <TouchableOpacity
      style={[
        styles.socialButton,
        isFacebook &&
          styles.facebookButton,
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            isFacebook
              ? COLORS.white
              : COLORS.text
          }
        />
      ) : (
        <>
          <FAIcon
            name={
              isFacebook
                ? 'facebook-f'
                : 'google'
            }
            size={15}
            color={
              isFacebook
                ? COLORS.white
                : COLORS.text
            }
            brand
          />

          <Text
            style={[
              styles.socialText,
              isFacebook &&
                styles.socialTextWhite,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/* ============================================================================
   MAIN SIGN IN
============================================================================ */

export default function SignIn({
  navigation,
}: any) {
  const { width, height } =
    useWindowDimensions();

  const isLargeScreen = width >= 800;
  const isSmallPhone = height < 700;

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [facebookLoading, setFacebookLoading] =
    useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [authError, setAuthError] =
    useState('');

  /* ==========================================================================
     VALIDATION
  ========================================================================== */

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
    } = {};

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      newErrors.email =
        'Please enter your email address.';
    } else if (
      !/\S+@\S+\.\S+/.test(cleanEmail)
    ) {
      newErrors.email =
        'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password =
        'Please enter your password.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /* ==========================================================================
     SIGN IN
  ========================================================================== */

  const handleLogin = async () => {
    setAuthError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email
            .trim()
            .toLowerCase(),

          password,
        });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (!data.user) {
        setAuthError(
          'Unable to sign in. Please try again.'
        );
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile
      ) {
        setAuthError(
          'Your profile could not be found.'
        );
        return;
      }

      if (
        profile.status &&
        profile.status !== 'active'
      ) {
        setAuthError(
          'Your account is currently inactive.'
        );
        return;
      }

      // AuthNavigator should handle navigation
      // after successful authentication.

    } catch (error: any) {
      setAuthError(
        error?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================================
     GOOGLE
  ========================================================================== */

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setAuthError('');

    try {
      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: 'google',
        });

      if (error) {
        Alert.alert(
          'Google Sign In',
          error.message
        );
      }
    } catch {
      Alert.alert(
        'Google Sign In',
        'Google sign in failed.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ==========================================================================
     FACEBOOK
  ========================================================================== */

  const handleFacebook = async () => {
    setFacebookLoading(true);
    setAuthError('');

    try {
      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: 'facebook',
        });

      if (error) {
        Alert.alert(
          'Facebook Sign In',
          error.message
        );
      }
    } catch {
      Alert.alert(
        'Facebook Sign In',
        'Facebook sign in failed.'
      );
    } finally {
      setFacebookLoading(false);
    }
  };

  /* ==========================================================================
     CHANGE INPUT
  ========================================================================== */

  const changeEmail = (
    value: string
  ) => {
    setEmail(value);

    setErrors(prev => ({
      ...prev,
      email: undefined,
    }));

    setAuthError('');
  };

  const changePassword = (
    value: string
  ) => {
    setPassword(value);

    setErrors(prev => ({
      ...prev,
      password: undefined,
    }));

    setAuthError('');
  };

  /* ==========================================================================
     SCREEN
  ========================================================================== */

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require(
          '../../assets/Signin.jpg'
        )}
        style={styles.background}
        resizeMode="cover"
      >
        {/* DARK OVERLAY */}

        <View
          style={styles.backgroundOverlay}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                minHeight: height,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ==============================================================
                HEADER
            ============================================================== */}

            <View
              style={[
                styles.header,
                isLargeScreen &&
                  styles.headerDesktop,
              ]}
            >
              <View style={styles.brandIcon}>
                <Icon
                  name="map-outline"
                  size={22}
                  color={COLORS.goldLight}
                />
              </View>

              <View>
                <Text style={styles.brand}>
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
            </View>

            {/* ==============================================================
                LOGIN AREA
            ============================================================== */}

            <View
              style={[
                styles.loginCard,
                isLargeScreen &&
                  styles.loginCardDesktop,
              ]}
            >

              {/* Small top accent */}

              <View
                style={styles.topAccent}
              />

              <Text style={styles.welcome}>
                WELCOME TO ETURISMO APP
              </Text>

              <Text style={styles.title}>
                Sign In
              </Text>

              <Text
                style={styles.description}
              >
                Continue exploring destinations,
                culture, and heritage.
              </Text>

              {/* ==========================================================
                  EMAIL
              ========================================================== */}

              <InputField
                label="Email"
                placeholder="Enter your email"
                value={email}
                icon="mail-outline"
                onChangeText={changeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              {/* ==========================================================
                  PASSWORD
              ========================================================== */}

              <InputField
                label="Password"
                placeholder="Enter your password"
                value={password}
                icon="lock-closed-outline"
                onChangeText={changePassword}
                secure
                showPassword={showPassword}
                onTogglePassword={() =>
                  setShowPassword(
                    value => !value
                  )
                }
                error={errors.password}
              />

              {/* ==========================================================
                  OPTIONS
              ========================================================== */}

              <View
                style={styles.optionsRow}
              >
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() =>
                    setRememberMe(
                      value => !value
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe &&
                        styles.checkboxChecked,
                    ]}
                  >
                    {rememberMe && (
                      <Icon
                        name="checkmark"
                        size={12}
                        color="#FFF"
                      />
                    )}
                  </View>

                  <Text
                    style={styles.rememberText}
                  >
                    Remember me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Forgot Password',
                      'Password recovery will be available here.'
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={styles.forgotText}
                  >
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ==========================================================
                  ERROR
              ========================================================== */}

              {authError ? (
                <View
                  style={styles.authError}
                >
                  <Icon
                    name="alert-circle-outline"
                    size={17}
                    color={COLORS.error}
                  />

                  <Text
                    style={
                      styles.authErrorText
                    }
                  >
                    {authError}
                  </Text>
                </View>
              ) : null}

              {/* ==========================================================
                  SIGN IN BUTTON
              ========================================================== */}

              <TouchableOpacity
                style={[
                  styles.signInButton,
                  loading &&
                    styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFF"
                  />
                ) : (
                  <>
                    <Text
                      style={
                        styles.signInText
                      }
                    >
                      Sign In
                    </Text>

                    <Icon
                      name="arrow-forward"
                      size={18}
                      color="#FFF"
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* ==========================================================
                  DIVIDER
              ========================================================== */}

              <View
                style={styles.divider}
              >
                <View
                  style={styles.dividerLine}
                />

                <Text
                  style={styles.dividerText}
                >
                  OR CONTINUE WITH
                </Text>

                <View
                  style={styles.dividerLine}
                />
              </View>

              {/* ==========================================================
                  SOCIAL
              ========================================================== */}

              <View
                style={styles.socialRow}
              >
                <SocialButton
                  type="google"
                  label="Google"
                  onPress={handleGoogle}
                  loading={googleLoading}
                />

                <SocialButton
                  type="facebook"
                  label="Facebook"
                  onPress={handleFacebook}
                  loading={
                    facebookLoading
                  }
                />
              </View>

              {/* ==========================================================
                  SIGN UP
              ========================================================== */}

              <View
                style={styles.signupRow}
              >
                <Text
                  style={styles.signupText}
                >
                  Don't have an account?
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'SignUp'
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={styles.signupLink}
                  >
                    Create one
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ==========================================================
                  SECURITY
              ========================================================== */}

              <View
                style={styles.security}
              >
                <Icon
                  name="shield-checkmark-outline"
                  size={14}
                  color={COLORS.gold}
                />

                <Text
                  style={styles.securityText}
                >
                  Your information is securely protected
                </Text>
              </View>
            </View>

            {/* ==============================================================
                FOOTER
            ============================================================== */}

            <Text
              style={[
                styles.footer,
                isLargeScreen &&
                  styles.footerDesktop,
              ]}
            >
              DISCOVER • EXPERIENCE • PRESERVE
            </Text>

          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

/* ============================================================================
   STYLES
============================================================================ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  flex: {
    flex: 1,
  },

  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor:
      'rgba(15, 13, 9, 0.62)',
  },

  scrollContent: {
    flexGrow: 1,

    alignItems: 'center',

    paddingHorizontal: 22,
    paddingTop: 45,
    paddingBottom: 25,
  },

  /* ==========================================================================
     BRAND
  ========================================================================== */

  header: {
    width: '100%',
    maxWidth: 1050,

    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 24,
  },

  headerDesktop: {
    marginBottom: 30,
  },

  brandIcon: {
    width: 44,
    height: 44,

    borderWidth: 1,
    borderColor:
      'rgba(212,181,106,0.65)',

    borderRadius: 22,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(20,17,12,0.45)',

    marginRight: 12,
  },

  brand: {
    color: COLORS.white,

    fontSize: 21,
    fontWeight: '800',

    letterSpacing: 3.2,
  },

  brandSubtitle: {
    color: COLORS.goldLight,

    fontSize: 7.5,
    fontWeight: '700',

    letterSpacing: 1.7,

    marginTop: 3,
  },

  /* ==========================================================================
     LOGIN CARD
  ========================================================================== */

  loginCard: {
    width: '100%',
    maxWidth: 430,

    backgroundColor:
      'rgba(246, 242, 234, 0.97)',

    borderRadius: 18,

    paddingHorizontal: 25,
    paddingTop: 24,
    paddingBottom: 22,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 15,
    },

    shadowOpacity: 0.32,
    shadowRadius: 28,

    elevation: 14,
  },

  loginCardDesktop: {
    maxWidth: 430,
  },

  topAccent: {
    width: 34,
    height: 3,

    backgroundColor: COLORS.gold,

    borderRadius: 2,

    marginBottom: 19,

    alignSelf: 'center',
  },

  welcome: {
    color: COLORS.gold,

    fontSize: 9,
    fontWeight: '800',

    letterSpacing: 2.3,

    marginBottom: 7,

    textAlign: 'center',
  },

  title: {
    color: COLORS.text,

    fontSize: 26,
    fontWeight: '800',

    letterSpacing: -0.5,

    textAlign: 'center',
  },

  description: {
    color: COLORS.textLight,

    fontSize: 12.5,
    lineHeight: 18,

    marginTop: 6,
    marginBottom: 22,

    textAlign: 'center',
  },

  /* ==========================================================================
     INPUTS
  ========================================================================== */

  fieldWrapper: {
    marginBottom: 14,
  },

  fieldLabel: {
    color: COLORS.text,

    fontSize: 10,
    fontWeight: '800',

    textTransform: 'uppercase',

    letterSpacing: 1,

    marginBottom: 6,
  },

  inputContainer: {
    height: 49,

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor:
      'rgba(255,255,255,0.92)',

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 9,

    paddingHorizontal: 13,

    gap: 9,
  },

  inputContainerFocused: {
    borderColor: COLORS.gold,

    backgroundColor:
      COLORS.white,
  },

  inputContainerError: {
    borderColor: COLORS.error,
  },

  input: {
    flex: 1,

    height: 47,

    paddingVertical: 0,

    color: COLORS.text,

    fontSize: 13.5,

    includeFontPadding: false,
  },

  eyeButton: {
    padding: 5,
  },

  fieldError: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 5,

    gap: 4,
  },

  errorText: {
    color: COLORS.error,

    fontSize: 10.5,
  },

  /* ==========================================================================
     OPTIONS
  ========================================================================== */

  optionsRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',
    alignItems: 'center',

    marginTop: 1,
    marginBottom: 17,
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 18,
    height: 18,

    borderWidth: 1,
    borderColor: '#CFC6B8',

    borderRadius: 4,

    backgroundColor: COLORS.white,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 7,
  },

  checkboxChecked: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },

  rememberText: {
    color: COLORS.textLight,

    fontSize: 11,
  },

  forgotText: {
    color: COLORS.gold,

    fontSize: 11,

    fontWeight: '700',
  },

  /* ==========================================================================
     ERROR
  ========================================================================== */

  authError: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor:
      COLORS.errorBg,

    borderWidth: 1,
    borderColor: '#E8C8C3',

    borderRadius: 8,

    paddingHorizontal: 10,
    paddingVertical: 8,

    marginBottom: 13,

    gap: 7,
  },

  authErrorText: {
    flex: 1,

    color: COLORS.error,

    fontSize: 10.5,
    lineHeight: 15,
  },

  /* ==========================================================================
     SIGN IN
  ========================================================================== */

  signInButton: {
    height: 49,

    borderRadius: 9,

    backgroundColor:
      COLORS.dark,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 9,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.18,
    shadowRadius: 8,

    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  signInText: {
    color: COLORS.white,

    fontSize: 13.5,
    fontWeight: '800',

    letterSpacing: 0.4,
  },

  /* ==========================================================================
     DIVIDER
  ========================================================================== */

  divider: {
    flexDirection: 'row',
    alignItems: 'center',

    marginVertical: 18,
  },

  dividerLine: {
    flex: 1,

    height: 1,

    backgroundColor:
      COLORS.border,
  },

  dividerText: {
    color: COLORS.muted,

    fontSize: 7.5,
    fontWeight: '800',

    letterSpacing: 1.2,

    marginHorizontal: 9,
  },

  /* ==========================================================================
     SOCIAL
  ========================================================================== */

  socialRow: {
    flexDirection: 'row',

    gap: 9,
  },

  socialButton: {
    flex: 1,

    height: 43,

    borderRadius: 8,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor:
      COLORS.white,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,
  },

  facebookButton: {
    backgroundColor:
      COLORS.facebook,

    borderColor:
      COLORS.facebook,
  },

  socialText: {
    color: COLORS.text,

    fontSize: 11,
    fontWeight: '700',
  },

  socialTextWhite: {
    color: COLORS.white,
  },

  /* ==========================================================================
     SIGN UP
  ========================================================================== */

  signupRow: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 19,
  },

  signupText: {
    color: COLORS.textLight,

    fontSize: 11.5,
  },

  signupLink: {
    color: COLORS.gold,

    fontSize: 11.5,

    fontWeight: '800',

    marginLeft: 5,
  },

  /* ==========================================================================
     SECURITY
  ========================================================================== */

  security: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 17,
    paddingTop: 12,

    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
  },

  securityText: {
    color: COLORS.muted,

    fontSize: 8.5,

    marginLeft: 5,
  },

  /* ==========================================================================
     FOOTER
  ========================================================================== */

  footer: {
    color:
      'rgba(255,255,255,0.60)',

    fontSize: 7.5,
    fontWeight: '700',

    letterSpacing: 2,

    marginTop: 20,

    textAlign: 'center',
  },

  footerDesktop: {
    marginTop: 23,
  },
});
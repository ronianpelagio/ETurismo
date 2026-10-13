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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FontAwesome5 as FAIcon } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

import { supabase } from '../../services/supabase';

// Required for expo-auth-session to complete the auth flow on Android
WebBrowser.maybeCompleteAuthSession();

/* ============================================================================
   ETurismo COLORS
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
  autoComplete?: ComponentProps<typeof TextInput>['autoComplete'];
  textContentType?: ComponentProps<typeof TextInput>['textContentType'];
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
  autoComplete,
  textContentType,
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
          size={17}
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
          autoComplete={autoComplete}
          textContentType={textContentType}
          selectionColor={COLORS.gold}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {secure && onTogglePassword && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={styles.eyeButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon
              name={
                showPassword
                  ? 'eye-outline'
                  : 'eye-off-outline'
              }
              size={17}
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
  const insets = useSafeAreaInsets();
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

  const [forgotLoading, setForgotLoading] =
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
     FORGOT PASSWORD
  ========================================================================== */

  const handleForgotPassword = async () => {
    // Prompt for email
    Alert.prompt(
      'Reset Password',
      'Enter your email address and we\'ll send you a reset link.',
      async (inputEmail) => {
        const cleanEmail = (inputEmail || '').trim().toLowerCase();
        if (!cleanEmail) return;
        if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
          Alert.alert('Invalid Email', 'Please enter a valid email address.');
          return;
        }
        setForgotLoading(true);
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: 'com.ronian.eturismo://reset-password',
          });
          if (error) throw error;
          Alert.alert(
            'Email Sent',
            `A password reset link has been sent to ${cleanEmail}. Check your inbox.`
          );
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to send reset email. Please try again.');
        } finally {
          setForgotLoading(false);
        }
      },
      'plain-text',
      email.trim(),
      'email-address'
    );
  };

  /* ==========================================================================
     GOOGLE PROFILE HELPER
  ========================================================================== */

  const getGoogleProfile = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Unable to retrieve Google account.');

    const user = data.user;
    const metadata = user.user_metadata ?? {};
    const fullName = metadata.full_name ?? metadata.name ?? '';

    return {
      userId: user.id,
      email: user.email ?? '',
      firstName: metadata.given_name ?? fullName.split(' ')[0] ?? '',
      lastName:
        metadata.family_name ??
        fullName.split(' ').slice(1).join(' ') ??
        '',
      profilePicture: metadata.avatar_url ?? metadata.picture ?? '',
    };
  };

  /* ==========================================================================
     GOOGLE
  ========================================================================== */

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setAuthError('');

    try {
      const redirectUri = AuthSession.makeRedirectUri({
  native: 'com.ronian.eturismo://auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.url) {
        throw new Error('Google OAuth URL was not returned.');
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        await WebBrowser.dismissBrowser();

        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.replace('#', ''));
        const code = url.searchParams.get('code');
        const callbackError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
        const accessToken  = url.searchParams.get('access_token')  ?? params.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token') ?? params.get('refresh_token');

        if (callbackError) {
          throw new Error(callbackError);
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          // The native callback can reach the app before Supabase finishes
          // persisting the session. Give that exchange a short opportunity to
          // complete instead of reporting a false failure.
          let sessionFound = false;
          for (let attempt = 0; attempt < 10; attempt += 1) {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              sessionFound = true;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          if (!sessionFound) {
            throw new Error('Sign in completed but session not found. Please try again.');
          }
        }

        // Retrieve and persist the Google profile so SignUp (googleMode)
        // can prefill name and avatar without another network call.
        try {
          const googleProfile = await getGoogleProfile();
          await AsyncStorage.setItem(
            'google_prefill_profile',
            JSON.stringify(googleProfile),
          );
          console.log('Google profile retrieved:', {
            hasEmail: Boolean(googleProfile.email),
            hasFirstName: Boolean(googleProfile.firstName),
            hasLastName: Boolean(googleProfile.lastName),
            hasProfilePicture: Boolean(googleProfile.profilePicture),
          });
        } catch (profileErr) {
          // Non-fatal — SignUp will fall back to reading supabase.auth.getUser()
          console.warn('[SignIn] Could not cache Google profile:', profileErr);
        }
        // AuthNavigator's onAuthStateChange will now detect SIGNED_IN and
        // route to the correct phase — no manual navigation needed here.
      } else if (result.type === 'cancel') {
        // User closed the browser — silent, no error
      }
    } catch (err: any) {
      Alert.alert('Google Sign In', err?.message || 'Google sign in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ==========================================================================
     FACEBOOK
  ========================================================================== */

  const handleFacebook = () => {
    Alert.alert('Coming Soon', 'Facebook sign in will be available soon.');
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
      <StatusBar style="light" />

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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                minHeight: Math.max(0, height - insets.top - insets.bottom),
                paddingTop: Math.max(20, insets.top + 12),
                paddingBottom: insets.bottom + 20,
                justifyContent: isSmallPhone ? 'flex-start' : 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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
                  size={18}
                  color={COLORS.goldLight}
                />
              </View>

              <View>
                <Text style={styles.brand}>
                  ETurismo
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
                SECURE MEMBER ACCESS
              </Text>

              <Text style={styles.title}>
                ETurismo
              </Text>

              <Text
                style={styles.description}
              >
                Continue exploring destinations,
                culture, and heritage.
              </Text>

              <View style={styles.benefitRow}>
                <View style={styles.benefit}><Icon name="heart-outline" size={14} color={COLORS.gold} /><Text style={styles.benefitText}>Favorite pieces</Text></View>
                <View style={styles.benefitDivider} />
                <View style={styles.benefit}><Icon name="shield-checkmark-outline" size={14} color={COLORS.gold} /><Text style={styles.benefitText}>Secure profile</Text></View>
              </View>

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
                autoComplete="email"
                textContentType="emailAddress"
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
                autoComplete="current-password"
                textContentType="password"
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
                  onPress={handleForgotPassword}
                  activeOpacity={0.7}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color={COLORS.gold} />
                  ) : (
                    <Text
                      style={styles.forgotText}
                    >
                      Forgot password?
                    </Text>
                  )}
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
                accessibilityRole="button"
                accessibilityState={{ busy: loading, disabled: loading }}
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
                      size={16}
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
                  loading={false}
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
                  style={styles.signupLinkButton}
                  onPress={() => navigation.navigate('SignUp')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Create an account"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,

    backgroundColor:
      'rgba(15, 13, 9, 0.62)',
  },

  scrollContent: {
    flexGrow: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 20,
  },

  /* ==========================================================================
     BRAND
  ========================================================================== */

  header: {
    width: '100%',
    maxWidth: 1050,

    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'center',
    marginBottom: 16,
  },

  headerDesktop: {
    marginBottom: 20,
  },

  brandIcon: {
    width: 36,
    height: 36,

    borderWidth: 1,
    borderColor:
      'rgba(212,181,106,0.65)',

    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(20,17,12,0.45)',

    marginRight: 10,
  },

  brand: {
    color: COLORS.white,

    fontSize: 18,
    fontWeight: '800',

    letterSpacing: 2.6,
  },

  brandSubtitle: {
    color: COLORS.goldLight,

    fontSize: 7,
    fontWeight: '700',

    letterSpacing: 1.5,

    marginTop: 2,
  },

  /* ==========================================================================
     LOGIN CARD
  ========================================================================== */

  loginCard: {
    width: '100%',
    maxWidth: 430,

    backgroundColor:
      'rgba(255, 255, 255, 0.97)',

    borderRadius: 16,
    overflow: 'hidden',

    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.28,
    shadowRadius: 20,

    elevation: 12,
  },

  loginCardDesktop: {
    maxWidth: 430,
  },

  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,

    backgroundColor: COLORS.gold,
  },

  welcome: {
    color: COLORS.gold,

    fontSize: 8.5,
    fontWeight: '800',

    letterSpacing: 2,

    marginBottom: 4,

    textAlign: 'center',
  },

  title: {
    color: COLORS.text,

    fontSize: 22,
    fontWeight: '800',

    letterSpacing: -0.5,

    textAlign: 'center',
  },

  description: {
    color: COLORS.textLight,

    fontSize: 12,
    lineHeight: 17,

    marginTop: 2,
    marginBottom: 14,

    textAlign: 'center',
  },

  benefitRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 10, marginBottom: 14,
    borderRadius: 10, backgroundColor: '#F5ECD9',
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  benefitText: { color: COLORS.dark, fontSize: 10, fontWeight: '700' },
  benefitDivider: { width: 1, height: 14, backgroundColor: '#DDCBA6', marginHorizontal: 10 },

  /* ==========================================================================
     INPUTS
  ========================================================================== */

  fieldWrapper: {
    marginBottom: 10,
  },

  fieldLabel: {
    color: COLORS.text,

    fontSize: 9.5,
    fontWeight: '800',

    textTransform: 'uppercase',

    letterSpacing: 1,

    marginBottom: 4,
  },

  inputContainer: {
    height: 44,

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor:
      'rgba(255,255,255,0.92)',

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 10,

    paddingHorizontal: 12,

    gap: 8,
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

    height: 42,

    paddingVertical: 0,

    color: COLORS.text,

    fontSize: 13,

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

    marginTop: 0,
    marginBottom: 12,
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

    marginBottom: 10,

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
    height: 44,

    borderRadius: 10,

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

    fontSize: 13,
    fontWeight: '800',

    letterSpacing: 0.4,
  },

  /* ==========================================================================
     DIVIDER
  ========================================================================== */

  divider: {
    flexDirection: 'row',
    alignItems: 'center',

    marginVertical: 13,
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

    height: 40,

    borderRadius: 10,

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

    marginTop: 14,
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
  signupLinkButton: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },

  /* ==========================================================================
     SECURITY
  ========================================================================== */

  security: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 12,
    paddingTop: 10,

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
    marginTop: 14,
    textAlign: 'center',
  },
  footerDesktop: {
    marginTop: 18,
  },
});
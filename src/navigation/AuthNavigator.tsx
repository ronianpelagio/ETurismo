import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GetStarted from '../screens/auth/GetStarted';
import SignIn from '../screens/auth/SignIn';
import SignUp from '../screens/auth/SignUp';
import VerifyOTP from '../screens/auth/VerifyOTP';
import TabNavigator from './TabNavigator';
import AppIntro from '../screens/auth/AppIntro';
import { supabase } from '../services/supabase';

// Keys
const DEVICE_ONBOARDED_KEY = 'device_onboarded'; // set after GetStarted slides, before login
const userOnboardedKey = (id: string) => `onboarded_${id}`; // set after AppIntro, after login

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const [session, setSession] = useState<any | null>(null);
  // null = not yet checked, true/false = checked
  const [deviceOnboarded, setDeviceOnboarded] = useState<boolean | null>(null);
  const [userOnboarded, setUserOnboarded] = useState<boolean | null>(null);

  // ── 1. Load device-level onboard flag on mount ──────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DEVICE_ONBOARDED_KEY).then(val => {
      setDeviceOnboarded(val === 'true');
    });
  }, []);

  // ── 2. Listen to auth session ───────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (isMounted) setSession(newSession);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ── 3. When user logs in, check their personal onboard flag ─────────────────
  useEffect(() => {
    if (!session?.user) {
      setUserOnboarded(null);
      return;
    }
    AsyncStorage.getItem(userOnboardedKey(session.user.id)).then(val => {
      setUserOnboarded(val === 'true');
    });
  }, [session?.user?.id]);

  // ── Callbacks ────────────────────────────────────────────────────────────────

  // Called when GetStarted slides finish (before login)
  async function completeDeviceOnboarding() {
    await AsyncStorage.setItem(DEVICE_ONBOARDED_KEY, 'true');
    setDeviceOnboarded(true);
  }

  // Called when AppIntro splash finishes (after login)
  async function completeUserOnboarding() {
    if (session?.user) {
      await AsyncStorage.setItem(userOnboardedKey(session.user.id), 'true');
      setUserOnboarded(true);
    }
  }

  // ── Wait for async checks before rendering ──────────────────────────────────
  if (deviceOnboarded === null) return null;
  if (session?.user && userOnboarded === null) return null;

  const isLoggedIn = Boolean(session?.user);

  return (
    <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        // ── Logged in ──────────────────────────────────────────────────────────
        userOnboarded ? (
          // Already completed full onboarding → go straight to app
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          // Logged in but hasn't seen the AppIntro splash yet
          <Stack.Screen name="AppIntro">
            {(props) => (
              <AppIntro {...props} onOnboardingComplete={completeUserOnboarding} />
            )}
          </Stack.Screen>
        )
      ) : (
        // ── Not logged in ──────────────────────────────────────────────────────
        deviceOnboarded ? (
          // Already seen the GetStarted slides → go straight to auth screens
          <>
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
          </>
        ) : (
          // First time on this device → show onboarding slides then auth
          <>
            <Stack.Screen name="GetStarted">
              {(props) => (
                <GetStarted {...props} onOnboardingComplete={completeDeviceOnboarding} />
              )}
            </Stack.Screen>
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
          </>
        )
      )}
    </Stack.Navigator>
  );
}


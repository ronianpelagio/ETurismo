import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppIntro   from '../screens/auth/AppIntro';
import GetStarted from '../screens/auth/GetStarted';
import SignIn     from '../screens/auth/SignIn';
import SignUp     from '../screens/auth/SignUp';
import VerifyOTP  from '../screens/auth/VerifyOTP';
import TabNavigator from './TabNavigator';

import { supabase }       from '../services/supabase';
import { touchLastSeen }  from '../services/authService';

// ─── Storage key ─────────────────────────────────────────────────────────────
// Stored per-install (AsyncStorage is wiped on uninstall).
// Once the user completes GetStarted on this install we set this to 'true'
// and never show it again — regardless of which account is logged in.
const GET_STARTED_SEEN_KEY = 'get_started_seen';

// ─── Navigator types ──────────────────────────────────────────────────────────
type Phase =
  | 'splash'       // AppIntro is playing
  | 'auth'         // Not logged in → SignIn / SignUp / VerifyOTP
  | 'getstarted'   // Logged in, first install → GetStarted
  | 'main';        // Logged in, GetStarted done → TabNavigator

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const [phase, setPhase] = useState<Phase>('splash');

  // Keep a ref so async callbacks always read the latest value
  const phaseRef = useRef<Phase>('splash');
  function transitionTo(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  // ── On mount: clean up legacy onboarded_ keys & attach auth listener ────────
  useEffect(() => {
    let isMounted = true;

    // Remove any legacy per-user onboarding flags from previous app versions
    // so existing users are treated the same as fresh installs (requirement #3).
    AsyncStorage.getAllKeys().then(keys => {
      const legacy = keys.filter(k => k.startsWith('onboarded_'));
      if (legacy.length) AsyncStorage.multiRemove(legacy).catch(() => {});
    }).catch(() => {});

    // Also remove the old device-level flag if it exists
    AsyncStorage.removeItem('device_onboarded').catch(() => {});

    // Auth state listener — fires on sign-in / sign-out
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Ignore unconfirmed sessions created right after signUp()
      if (event === 'SIGNED_IN' && !session?.user?.email_confirmed_at) return;

      if (session?.user) {
        // Stamp last_seen
        touchLastSeen(session.user.id).catch(() => {});

        // Check if this install has already seen GetStarted
        const seen = await AsyncStorage.getItem(GET_STARTED_SEEN_KEY).catch(() => null);

        if (!isMounted) return;
        transitionTo(seen === 'true' ? 'main' : 'getstarted');
      } else {
        // Signed out — go back to auth screens (splash already played)
        if (phaseRef.current !== 'splash') {
          transitionTo('auth');
        }
      }
    });

    // Stamp last_seen when app comes back to foreground
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.getSession().then(({ data }) => {
          const uid = data.session?.user?.id;
          if (uid) touchLastSeen(uid).catch(() => {});
        });
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  // ── AppIntro finished ────────────────────────────────────────────────────────
  // Called by AppIntro once its animation completes (every launch).
  const handleIntroDone = async () => {
    const { data } = await supabase.auth.getSession();
    const session  = data?.session;
    const confirmed = session?.user?.email_confirmed_at ? session : null;

    if (confirmed?.user) {
      touchLastSeen(confirmed.user.id).catch(() => {});
      const seen = await AsyncStorage.getItem(GET_STARTED_SEEN_KEY).catch(() => null);
      transitionTo(seen === 'true' ? 'main' : 'getstarted');
    } else {
      transitionTo('auth');
    }
  };

  // ── GetStarted finished ──────────────────────────────────────────────────────
  const handleGetStartedDone = async () => {
    await AsyncStorage.setItem(GET_STARTED_SEEN_KEY, 'true').catch(() => {});
    transitionTo('main');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false, animation: 'fade' }}>
      {phase === 'splash' ? (
        // ── 1. Splash — always first, every launch ───────────────────────────
        <Stack.Screen name="AppIntro">
          {(props) => (
            <AppIntro {...props} onDone={handleIntroDone} />
          )}
        </Stack.Screen>

      ) : phase === 'auth' ? (
        // ── 2. Auth screens — user is not logged in ──────────────────────────
        <>
          <Stack.Screen name="SignIn"    component={SignIn} />
          <Stack.Screen name="SignUp"    component={SignUp} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
        </>

      ) : phase === 'getstarted' ? (
        // ── 3. GetStarted — logged in, first install ─────────────────────────
        <Stack.Screen name="GetStarted">
          {(props) => (
            <GetStarted {...props} onOnboardingComplete={handleGetStartedDone} />
          )}
        </Stack.Screen>

      ) : (
        // ── 4. Main app ──────────────────────────────────────────────────────
        <Stack.Screen name="Main" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppIntro   from '../screens/auth/AppIntro';
import GetStarted from '../screens/auth/GetStarted';
import SignIn     from '../screens/auth/SignIn';
import SignUp     from '../screens/auth/SignUp';
import VerifyOTP  from '../screens/auth/VerifyOTP';
import TabNavigator from './TabNavigator';
import DeactivatedModal from '../components/DeactivatedModal';

import { supabase }       from '../services/supabase';
import { touchLastSeen }  from '../services/authService';
import { finalizePendingProfile } from '../features/auth/services/pendingProfile';

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
  const [showDeactivated, setShowDeactivated] = useState(false);

  // Keep a ref so async callbacks always read the latest value
  const phaseRef = useRef<Phase>('splash');
  function transitionTo(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  // ── Deactivation helper ───────────────────────────────────────────────────
  // Queries the current user's status. If inactive, signs them out and shows
  // the deactivation modal. Returns true if the user was deactivated.
  const checkAndHandleStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('status')
        .eq('id', userId)
        .maybeSingle();

      if (profile && profile.status !== 'active') {
        await supabase.auth.signOut();
        setShowDeactivated(true);
        return true;
      }
    } catch (_) {
      // Network failure — do not sign the user out speculatively
    }
    return false;
  }, []);

  // ── On mount: clean up legacy onboarded_ keys & attach auth listener ────────
  useEffect(() => {
    let isMounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    // Remove any legacy per-user onboarding flags from previous app versions
    AsyncStorage.getAllKeys().then(keys => {
      const legacy = keys.filter(k => k.startsWith('onboarded_'));
      if (legacy.length) AsyncStorage.multiRemove(legacy).catch(() => {});
    }).catch(() => {});

    AsyncStorage.removeItem('device_onboarded').catch(() => {});

    // ── Subscribe to live status changes for the signed-in user ─────────────
    const subscribeToStatus = (userId: string) => {
      // Clean up any previous channel first
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }

      realtimeChannel = supabase
        .channel(`user-status-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${userId}`,
          },
          async (payload) => {
            if (!isMounted) return;
            const newStatus = payload.new?.status;
            if (newStatus && newStatus !== 'active') {
              await supabase.auth.signOut();
              if (isMounted) setShowDeactivated(true);
            }
          }
        )
        .subscribe();
    };

    const unsubscribeFromStatus = () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    };

    // Auth state listener — fires on sign-in / sign-out
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Ignore unconfirmed sessions created right after signUp()
      if (event === 'SIGNED_IN' && !session?.user?.email_confirmed_at) return;

      if (session?.user) {
        // Finish the verified user's profile before leaving the auth flow
        try {
          await finalizePendingProfile(session.user.email ?? '', session.user.id);
        } catch (error) {
          console.warn('Profile setup could not be completed:', error);
          return;
        }

        // Check status before navigating in — catches OAuth/Google sign-ins
        // and any session restore where SignIn.tsx didn't run the check
        if (!isMounted) return;
        const deactivated = await checkAndHandleStatus(session.user.id);
        if (deactivated || !isMounted) return;

        // Stamp last_seen
        touchLastSeen(session.user.id).catch(() => {});

        // Start watching this user's status row for live deactivation
        subscribeToStatus(session.user.id);

        const seen = await AsyncStorage.getItem(GET_STARTED_SEEN_KEY).catch(() => null);
        if (!isMounted) return;
        transitionTo(seen === 'true' ? 'main' : 'getstarted');
      } else {
        // Signed out — stop watching status and go back to auth screens
        unsubscribeFromStatus();
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
      unsubscribeFromStatus();
    };
  }, [checkAndHandleStatus]);

  // ── AppIntro finished ────────────────────────────────────────────────────────
  const handleIntroDone = async () => {
    const { data } = await supabase.auth.getSession();
    const session  = data?.session;
    const confirmed = session?.user?.email_confirmed_at ? session : null;

    if (confirmed?.user) {
      // Check status on every app open — catches users deactivated while offline
      const deactivated = await checkAndHandleStatus(confirmed.user.id);
      if (deactivated) return;

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
    <>
      <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false, animation: 'fade' }}>
        {phase === 'splash' ? (
          <Stack.Screen name="AppIntro">
            {(props) => <AppIntro {...props} onDone={handleIntroDone} />}
          </Stack.Screen>

        ) : phase === 'auth' ? (
          <>
            <Stack.Screen name="SignIn"    component={SignIn} />
            <Stack.Screen name="SignUp"    component={SignUp} />
            <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
          </>

        ) : phase === 'getstarted' ? (
          <Stack.Screen name="GetStarted">
            {(props) => (
              <GetStarted {...props} onOnboardingComplete={handleGetStartedDone} />
            )}
          </Stack.Screen>

        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>

      {/* Force-logout deactivation notice — rendered outside the navigator
          so it appears on top of any screen, including the main app */}
      <DeactivatedModal
        visible={showDeactivated}
        onDismiss={() => setShowDeactivated(false)}
      />
    </>
  );
}

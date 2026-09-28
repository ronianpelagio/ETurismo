import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';

import AppIntro from '../screens/auth/AppIntro';
import GetStarted from '../screens/auth/GetStarted';
import SignIn from '../screens/auth/SignIn';
import SignUp from '../screens/auth/SignUp';
import VerifyOTP from '../screens/auth/VerifyOTP';
import TabNavigator from './TabNavigator';

import NotifPermissionPrimer from '../components/NotifPermissionPrimer';
import { supabase } from '../services/supabase';
import { touchLastSeen } from '../services/authService';
import { finalizePendingProfile } from '../features/auth/services/pendingProfile';

import {
  hasShownNotifPrimer,
  markNotifPrimerShown,
  syncPushToken,
} from '../services/notificationService';

const GET_STARTED_SEEN_KEY = 'get_started_seen';

type Phase = 'splash' | 'auth' | 'googleprofile' | 'getstarted' | 'main';

const Stack = createNativeStackNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (no component state needed)
// ─────────────────────────────────────────────────────────────────────────────

function isGoogleUser(user: User): boolean {
  return (
    user.app_metadata?.provider === 'google' ||
    !!user.identities?.some((identity) => identity.provider === 'google')
  );
}

/** Where a fully set-up user goes: onboarding once, then the app. */
async function defaultDestination(): Promise<Phase> {
  const seen = await AsyncStorage.getItem(GET_STARTED_SEEN_KEY).catch(
    () => null,
  );
  return seen === 'true' ? 'main' : 'getstarted';
}

/** Full routing decision for a signed-in user (handles Google profile gate). */
async function resolveDestination(user: User): Promise<Phase> {
  if (!isGoogleUser(user)) {
    return defaultDestination();
  }

  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('gender,age,country,"Address",province,city,barangay')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Could not check Google profile:', error.message);
      return 'googleprofile';
    }

    const incomplete =
      !profile?.gender ||
      !profile?.age ||
      !profile?.country ||
      !profile?.Address;

    return incomplete ? 'googleprofile' : defaultDestination();
  } catch (error) {
    // Never leave the user stranded on the auth screen.
    console.warn('Google profile check failed:', error);
    return 'googleprofile';
  }
}

/** Finalize pending email/password profile and make sure public.users exists. */
async function ensureUserRow(user: User) {
  try {
    await finalizePendingProfile(user.email ?? '', user.id);
  } catch (error) {
    console.warn('Profile setup could not be completed:', error);
  }

  try {
    const meta = user.user_metadata ?? {};
    const fullName: string = meta.full_name ?? meta.name ?? '';

    // ignoreDuplicates: true → only creates a missing row. Existing rows
    // (and anything the user edited later) are never overwritten.
    const { error } = await supabase.from('users').upsert(
      {
        id: user.id,
        email: user.email ?? '',
        first_name: meta.first_name || fullName.split(' ')[0] || '',
        last_name:
          meta.last_name || fullName.split(' ').slice(1).join(' ') || '',
        profile_picture: meta.avatar_url ?? meta.picture ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    if (error) {
      console.warn('User row upsert skipped:', error.message);
    }
  } catch (error) {
    console.warn('User row upsert skipped:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthNavigator() {
  const [phase, setPhase] = useState<Phase>('splash');

  const [showNotifPrimer, setShowNotifPrimer] = useState(false);
  const [notificationUserId, setNotificationUserId] =
    useState<string | null>(null);

  const notificationCheckRef = useRef<string | null>(null);
  const phaseRef = useRef<Phase>('splash');
  const mountedRef = useRef(true);

  function transitionTo(next: Phase) {
    if (!mountedRef.current) return;
    phaseRef.current = next;
    setPhase(next);
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  async function prepareNotifications(userId: string) {
    if (notificationCheckRef.current === userId) return;

    notificationCheckRef.current = userId;
    setNotificationUserId(userId);

    try {
      const primerShown = await hasShownNotifPrimer();

      if (!primerShown) {
        setShowNotifPrimer(true);
        return;
      }

      syncPushToken(userId).catch((error) => {
        console.warn('[AuthNavigator] Push token refresh failed:', error);
      });
    } catch (error) {
      console.warn('[AuthNavigator] Notification initialization failed:', error);
    }
  }

  const handleNotifAllow = async () => {
    const userId = notificationUserId;
    setShowNotifPrimer(false);

    try {
      await markNotifPrimerShown();
    } catch (error) {
      console.warn('[AuthNavigator] Could not save primer state:', error);
    }

    if (!userId) return;

    syncPushToken(userId).catch((error) => {
      console.warn('[AuthNavigator] Push registration failed:', error);
    });
  };

  const handleNotifDismiss = async () => {
    setShowNotifPrimer(false);

    try {
      await markNotifPrimerShown();
    } catch (error) {
      console.warn('[AuthNavigator] Could not save primer state:', error);
    }
  };

  // ── Signed-in handling ─────────────────────────────────────────────────────

  async function handleSignedIn(user: User) {
    // Only route while the user is on the sign-in/sign-up screens. Repeat
    // events (USER_UPDATED, duplicate SIGNED_IN) must not move someone who is
    // already in onboarding, profile completion, or the app. During 'splash'
    // the AppIntro callback decides the destination.
    const canRoute = phaseRef.current === 'auth';
    const google = isGoogleUser(user);

    // Email/password users can go in right away; profile setup continues
    // in the background.
    if (canRoute && !google) {
      transitionTo(await defaultDestination());
    }

    await ensureUserRow(user);
    if (!mountedRef.current) return;

    // Google users are gated on profile completeness, which needs the row.
    if (canRoute && google) {
      transitionTo(await resolveDestination(user));
    }

    touchLastSeen(user.id).catch(() => {});
    prepareNotifications(user.id).catch(() => {});
  }

  // ── Auth listener ──────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    // Remove legacy onboarding flags.
    AsyncStorage.getAllKeys()
      .then((keys) => {
        const legacy = keys.filter((key) => key.startsWith('onboarded_'));
        if (legacy.length) {
          AsyncStorage.multiRemove(legacy).catch(() => {});
        }
      })
      .catch(() => {});
    AsyncStorage.removeItem('device_onboarded').catch(() => {});

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;

        // Signed out (or no session).
        if (!session?.user) {
          setShowNotifPrimer(false);
          setNotificationUserId(null);
          notificationCheckRef.current = null;

          if (phaseRef.current !== 'splash') {
            transitionTo('auth');
          }
          return;
        }

        // INITIAL_SESSION is handled by handleIntroDone (so the splash always
        // plays). TOKEN_REFRESHED never changes where the user should be.
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          return;
        }

        // Ignore unconfirmed sessions created right after sign-up.
        if (!session.user.email_confirmed_at) return;

        const user = session.user;

        // IMPORTANT: do not await Supabase calls inside this callback.
        // It runs while the auth lock is held, so calling supabase.from()
        // here can deadlock. Defer to the next tick.
        setTimeout(() => {
          handleSignedIn(user).catch((error) => {
            console.warn('[AuthNavigator] Sign-in handling failed:', error);
          });
        }, 0);
      },
    );

    const appStateSub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state !== 'active') return;

        supabase.auth
          .getSession()
          .then(({ data }) => {
            const uid = data.session?.user?.id;
            if (uid) touchLastSeen(uid).catch(() => {});
          })
          .catch((error) => {
            console.warn('[AuthNavigator] Could not refresh session:', error);
          });
      },
    );

    return () => {
      mountedRef.current = false;
      authListener.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  // ── AppIntro finished ──────────────────────────────────────────────────────

  const handleIntroDone = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      if (!user || !user.email_confirmed_at) {
        transitionTo('auth');
        return;
      }

      touchLastSeen(user.id).catch(() => {});

      transitionTo(await resolveDestination(user));

      prepareNotifications(user.id).catch(() => {});
    } catch (error) {
      console.warn('[AuthNavigator] Failed to restore session:', error);
      transitionTo('auth');
    }
  };

  // ── GetStarted finished ────────────────────────────────────────────────────

  const handleGetStartedDone = async () => {
    await AsyncStorage.setItem(GET_STARTED_SEEN_KEY, 'true').catch(() => {});
    transitionTo('main');
  };

  // ── Google profile completed ───────────────────────────────────────────────

  const handleGoogleComplete = async () => {
    transitionTo(await defaultDestination());
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Navigator
        id="AuthStack"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        {phase === 'splash' ? (
          <Stack.Screen name="AppIntro">
            {(props) => <AppIntro {...props} onDone={handleIntroDone} />}
          </Stack.Screen>
        ) : phase === 'auth' ? (
          <>
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
          </>
        ) : phase === 'googleprofile' ? (
          <Stack.Screen name="GoogleProfile">
            {(props) => (
              <SignUp
                {...props}
                googleMode
                onGoogleComplete={handleGoogleComplete}
              />
            )}
          </Stack.Screen>
        ) : phase === 'getstarted' ? (
          <Stack.Screen name="GetStarted">
            {(props) => (
              <GetStarted
                {...props}
                onOnboardingComplete={handleGetStartedDone}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>

      {/* Our own explanation UI, shown before the OS permission dialog.
          Allow    → syncPushToken() → OS permission → Expo token → Supabase
          Not now  → closes; auth/navigation continue normally */}
      <NotifPermissionPrimer
        visible={showNotifPrimer}
        onAllow={handleNotifAllow}
        onDismiss={handleNotifDismiss}
      />
    </>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
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

type Phase =
  | 'splash'
  | 'auth'
  | 'googleprofile'
  | 'getstarted'
  | 'main';

type UserAccountStatus = 'active' | 'inactive';

const Stack = createNativeStackNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isGoogleUser(user: User): boolean {
  return (
    user.app_metadata?.provider === 'google' ||
    !!user.identities?.some(
      (identity) => identity.provider === 'google',
    )
  );
}

/**
 * Where a fully set-up user goes:
 * onboarding once, then the main application.
 */
async function defaultDestination(): Promise<Phase> {
  const seen = await AsyncStorage.getItem(
    GET_STARTED_SEEN_KEY,
  ).catch(() => null);

  return seen === 'true' ? 'main' : 'getstarted';
}

/**
 * Full routing decision for a signed-in user.
 * Google users may need to finish their profile.
 */
async function resolveDestination(
  user: User,
): Promise<Phase> {
  if (!isGoogleUser(user)) {
    return defaultDestination();
  }

  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select(
        'gender,age,country,"Address",province,city,barangay',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn(
        'Could not check Google profile:',
        error.message,
      );

      return 'googleprofile';
    }

    const incomplete =
      !profile?.gender ||
      !profile?.age ||
      !profile?.country ||
      !profile?.Address;

    return incomplete
      ? 'googleprofile'
      : defaultDestination();
  } catch (error) {
    console.warn(
      'Google profile check failed:',
      error,
    );

    return 'googleprofile';
  }
}

/**
 * Finalize pending email/password profile and ensure
 * public.users exists.
 */
async function ensureUserRow(user: User) {
  try {
    await finalizePendingProfile(
      user.email ?? '',
      user.id,
    );
  } catch (error) {
    console.warn(
      'Profile setup could not be completed:',
      error,
    );
  }

  try {
    const meta = user.user_metadata ?? {};

    const fullName: string =
      meta.full_name ?? meta.name ?? '';

    const { error } = await supabase
      .from('users')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          first_name:
            meta.first_name ||
            fullName.split(' ')[0] ||
            '',
          last_name:
            meta.last_name ||
            fullName
              .split(' ')
              .slice(1)
              .join(' ') ||
            '',
          profile_picture:
            meta.avatar_url ??
            meta.picture ??
            null,
        },
        {
          onConflict: 'id',
          ignoreDuplicates: true,
        },
      );

    if (error) {
      console.warn(
        'User row upsert skipped:',
        error.message,
      );
    }
  } catch (error) {
    console.warn(
      'User row upsert skipped:',
      error,
    );
  }
}

/**
 * Check account status.
 *
 * IMPORTANT:
 * null means we could not determine the status.
 * A network/database error MUST NOT be treated as a ban.
 */
async function getUserAccountStatus(
  userId: string,
): Promise<UserAccountStatus | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('status')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn(
        '[AuthNavigator] Could not check account status:',
        error.message,
      );

      return null;
    }

    if (!data) {
      return null;
    }

    if (data.status === 'inactive') {
      return 'inactive';
    }

    return 'active';
  } catch (error) {
    console.warn(
      '[AuthNavigator] Account status check failed:',
      error,
    );

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthNavigator() {
  const [phase, setPhase] =
    useState<Phase>('splash');

  const [
    showNotifPrimer,
    setShowNotifPrimer,
  ] = useState(false);

  const [
    notificationUserId,
    setNotificationUserId,
  ] = useState<string | null>(null);

  const notificationCheckRef =
    useRef<string | null>(null);

  const phaseRef =
    useRef<Phase>('splash');

  const mountedRef = useRef(true);

  /**
   * Holds the current Realtime subscription.
   */
  const statusChannelRef =
    useRef<ReturnType<
      typeof supabase.channel
    > | null>(null);

  /**
   * Prevent duplicate banned-account handling.
   */
  const handlingBanRef = useRef(false);

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation
  // ───────────────────────────────────────────────────────────────────────────

  function transitionTo(next: Phase) {
    if (!mountedRef.current) return;

    phaseRef.current = next;
    setPhase(next);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Notifications
  // ───────────────────────────────────────────────────────────────────────────

  async function prepareNotifications(
    userId: string,
  ) {
    if (
      notificationCheckRef.current === userId
    ) {
      return;
    }

    notificationCheckRef.current = userId;
    setNotificationUserId(userId);

    try {
      const primerShown =
        await hasShownNotifPrimer();

      if (!primerShown) {
        setShowNotifPrimer(true);
        return;
      }

      syncPushToken(userId).catch(
        (error) => {
          console.warn(
            '[AuthNavigator] Push token refresh failed:',
            error,
          );
        },
      );
    } catch (error) {
      console.warn(
        '[AuthNavigator] Notification initialization failed:',
        error,
      );
    }
  }

  const handleNotifAllow = async () => {
    const userId = notificationUserId;

    setShowNotifPrimer(false);

    try {
      await markNotifPrimerShown();
    } catch (error) {
      console.warn(
        '[AuthNavigator] Could not save primer state:',
        error,
      );
    }

    if (!userId) return;

    syncPushToken(userId).catch(
      (error) => {
        console.warn(
          '[AuthNavigator] Push registration failed:',
          error,
        );
      },
    );
  };

  const handleNotifDismiss = async () => {
    setShowNotifPrimer(false);

    try {
      await markNotifPrimerShown();
    } catch (error) {
      console.warn(
        '[AuthNavigator] Could not save primer state:',
        error,
      );
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // User Status / Ban Handling
  // ───────────────────────────────────────────────────────────────────────────

  function stopUserStatusListener() {
    const channel =
      statusChannelRef.current;

    if (!channel) return;

    statusChannelRef.current = null;

    supabase
      .removeChannel(channel)
      .catch((error) => {
        console.warn(
          '[AuthNavigator] Could not remove status listener:',
          error,
        );
      });
  }

  /**
   * Called ONLY when status = inactive has been confirmed.
   *
   * Offline/network/database errors never call this.
   */
  async function handleBannedAccount() {
    if (handlingBanRef.current) {
      return;
    }

    handlingBanRef.current = true;

    console.warn(
      '[AuthNavigator] Banned account detected.',
    );

    // Stop listening immediately so another event
    // cannot trigger another modal.
    stopUserStatusListener();

    // Close notification UI.
    setShowNotifPrimer(false);
    setNotificationUserId(null);
    notificationCheckRef.current = null;

    /**
     * Sign the user out first.
     *
     * Auth state listener will also transition to
     * the authentication screen.
     */
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn(
        '[AuthNavigator] Sign out failed:',
        error,
      );
    }

    if (mountedRef.current) {
      transitionTo('auth');
    }

    /**
     * Show the real reason.
     *
     * This modal is shown ONLY after we confirmed
     * public.users.status === "inactive".
     */
    Alert.alert(
      'Account Banned',
      'Your account has been banned by the administrator. Please contact the administrator if you believe this is a mistake.',
      [
        {
          text: 'OK',
          onPress: () => {
            handlingBanRef.current = false;
          },
        },
      ],
      {
        cancelable: false,
      },
    );
  }

  /**
   * Check status manually.
   *
   * Returns:
   * true  -> confirmed banned
   * false -> active OR status could not be checked
   *
   * Network errors therefore never become bans.
   */
  async function checkForBannedAccount(
    userId: string,
  ): Promise<boolean> {
    const status =
      await getUserAccountStatus(userId);

    if (status !== 'inactive') {
      return false;
    }

    await handleBannedAccount();

    return true;
  }

  /**
   * Listen for public.users.status changes while
   * the user has the application open.
   */
  function startUserStatusListener(
    userId: string,
  ) {
    stopUserStatusListener();

    console.log(
      '[AuthNavigator] Starting user status listener:',
      userId,
    );

    const channel = supabase
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
          const updated =
            payload.new as {
              id?: string;
              status?: string;
            };

          console.log(
            '[AuthNavigator] User account status changed:',
            updated.status,
          );

          /**
           * ONLY a confirmed inactive status
           * triggers automatic logout.
           */
          if (
            updated.status === 'inactive'
          ) {
            console.warn(
              '[AuthNavigator] Account banned by administrator.',
            );

            await handleBannedAccount();
          }
        },
      )
      .subscribe((status) => {
        console.log(
          '[AuthNavigator] Status listener:',
          status,
        );
      });

    statusChannelRef.current = channel;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Signed-in Handling
  // ───────────────────────────────────────────────────────────────────────────

  async function handleSignedIn(
    user: User,
  ) {
    const canRoute =
      phaseRef.current === 'auth';

    const google =
      isGoogleUser(user);

    /**
     * Ensure public.users exists before checking
     * the account status.
     */
    await ensureUserRow(user);

    if (!mountedRef.current) return;

    /**
     * SECURITY:
     * Do not allow inactive users into ETurismo.
     */
    const banned =
      await checkForBannedAccount(
        user.id,
      );

    if (banned) {
      return;
    }

    if (!mountedRef.current) return;

    /**
     * Begin watching for an admin banning the
     * currently logged-in account.
     */
    startUserStatusListener(user.id);

    /**
     * Email/password users.
     */
    if (canRoute && !google) {
      transitionTo(
        await defaultDestination(),
      );
    }

    /**
     * Google users.
     */
    if (canRoute && google) {
      transitionTo(
        await resolveDestination(user),
      );
    }

    touchLastSeen(user.id).catch(
      () => {},
    );

    prepareNotifications(user.id).catch(
      () => {},
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Auth Listener
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    // Remove legacy onboarding flags.
    AsyncStorage.getAllKeys()
      .then((keys) => {
        const legacy = keys.filter(
          (key) =>
            key.startsWith('onboarded_'),
        );

        if (legacy.length) {
          AsyncStorage.multiRemove(
            legacy,
          ).catch(() => {});
        }
      })
      .catch(() => {});

    AsyncStorage.removeItem(
      'device_onboarded',
    ).catch(() => {});

    // ─────────────────────────────────────────────────────────────────────────
    // Supabase authentication events
    // ─────────────────────────────────────────────────────────────────────────

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mountedRef.current) {
            return;
          }

          // ───────────────────────────────────────────────────────────────────
          // Signed out
          // ───────────────────────────────────────────────────────────────────

          if (!session?.user) {
            stopUserStatusListener();

            setShowNotifPrimer(false);
            setNotificationUserId(null);

            notificationCheckRef.current =
              null;

            if (
              phaseRef.current !==
              'splash'
            ) {
              transitionTo('auth');
            }

            return;
          }

          /**
           * INITIAL_SESSION is handled by
           * handleIntroDone so AppIntro still plays.
           *
           * TOKEN_REFRESHED does not need to
           * reroute the user.
           */
          if (
            event ===
              'INITIAL_SESSION' ||
            event ===
              'TOKEN_REFRESHED'
          ) {
            return;
          }

          /**
           * Ignore unconfirmed email sessions.
           */
          if (
            !session.user
              .email_confirmed_at
          ) {
            return;
          }

          const user =
            session.user;

          /**
           * IMPORTANT:
           *
           * Don't await Supabase database calls
           * directly inside onAuthStateChange.
           *
           * Defer them so the auth lock can finish.
           */
          setTimeout(() => {
            handleSignedIn(
              user,
            ).catch((error) => {
              console.warn(
                '[AuthNavigator] Sign-in handling failed:',
                error,
              );
            });
          }, 0);
        },
      );

    // ─────────────────────────────────────────────────────────────────────────
    // App foreground listener
    // ─────────────────────────────────────────────────────────────────────────

    const appStateSub =
      AppState.addEventListener(
        'change',
        (
          state: AppStateStatus,
        ) => {
          if (
            state !== 'active'
          ) {
            return;
          }

          /**
           * Whenever the user comes back to
           * ETurismo, verify their account again.
           *
           * This protects against:
           *
           * - Realtime disconnecting
           * - Phone sleeping
           * - App being backgrounded
           * - Ban happening while app was paused
           */
          supabase.auth
            .getSession()
            .then(async ({ data }) => {
              const user =
                data.session?.user;

              if (!user) {
                return;
              }

              const banned =
                await checkForBannedAccount(
                  user.id,
                );

              if (banned) {
                return;
              }

              /**
               * Restart Realtime in case the
               * previous connection was dropped.
               */
              startUserStatusListener(
                user.id,
              );

              touchLastSeen(
                user.id,
              ).catch(() => {});
            })
            .catch((error) => {
              /**
               * IMPORTANT:
               * This is NOT treated as a ban.
               */
              console.warn(
                '[AuthNavigator] Could not refresh session:',
                error,
              );
            });
        },
      );

    return () => {
      mountedRef.current = false;

      stopUserStatusListener();

      authListener.subscription.unsubscribe();

      appStateSub.remove();
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // AppIntro Finished / Restore Session
  // ───────────────────────────────────────────────────────────────────────────

  const handleIntroDone =
    async () => {
      try {
        const { data } =
          await supabase.auth.getSession();

        const user =
          data?.session?.user;

        if (
          !user ||
          !user.email_confirmed_at
        ) {
          transitionTo('auth');
          return;
        }

        /**
         * Make sure the profile exists.
         */
        await ensureUserRow(user);

        /**
         * IMPORTANT:
         * Check status BEFORE entering the app.
         */
        const banned =
          await checkForBannedAccount(
            user.id,
          );

        if (banned) {
          return;
        }

        /**
         * User is active.
         * Start Realtime monitoring.
         */
        startUserStatusListener(
          user.id,
        );

        touchLastSeen(
          user.id,
        ).catch(() => {});

        transitionTo(
          await resolveDestination(
            user,
          ),
        );

        prepareNotifications(
          user.id,
        ).catch(() => {});
      } catch (error) {
        /**
         * Failure to restore a session is not
         * automatically considered a ban.
         */
        console.warn(
          '[AuthNavigator] Failed to restore session:',
          error,
        );

        transitionTo('auth');
      }
    };

  // ───────────────────────────────────────────────────────────────────────────
  // GetStarted Finished
  // ───────────────────────────────────────────────────────────────────────────

  const handleGetStartedDone =
    async () => {
      await AsyncStorage.setItem(
        GET_STARTED_SEEN_KEY,
        'true',
      ).catch(() => {});

      transitionTo('main');
    };

  // ───────────────────────────────────────────────────────────────────────────
  // Google Profile Completed
  // ───────────────────────────────────────────────────────────────────────────

  const handleGoogleComplete =
    async () => {
      /**
       * Check account again before entering
       * the application.
       */
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (user) {
        const banned =
          await checkForBannedAccount(
            user.id,
          );

        if (banned) {
          return;
        }

        startUserStatusListener(
          user.id,
        );
      }

      transitionTo(
        await defaultDestination(),
      );
    };

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Navigator
        id="AuthStack"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {phase === 'splash' ? (
          <Stack.Screen name="AppIntro">
            {(props) => (
              <AppIntro
                {...props}
                onDone={
                  handleIntroDone
                }
              />
            )}
          </Stack.Screen>
        ) : phase === 'auth' ? (
          <>
            <Stack.Screen
              name="SignIn"
              component={SignIn}
            />

            <Stack.Screen
              name="SignUp"
              component={SignUp}
            />

            <Stack.Screen
              name="VerifyOTP"
              component={VerifyOTP}
            />
          </>
        ) : phase ===
          'googleprofile' ? (
          <Stack.Screen name="GoogleProfile">
            {(props) => (
              <SignUp
                {...props}
                googleMode
                onGoogleComplete={
                  handleGoogleComplete
                }
              />
            )}
          </Stack.Screen>
        ) : phase ===
          'getstarted' ? (
          <Stack.Screen name="GetStarted">
            {(props) => (
              <GetStarted
                {...props}
                onOnboardingComplete={
                  handleGetStartedDone
                }
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen
            name="Main"
            component={TabNavigator}
          />
        )}
      </Stack.Navigator>

      {/*
        Notification permission explanation.

        Allow
          → syncPushToken()
          → OS permission
          → Expo token
          → Supabase

        Not now
          → closes
          → authentication/navigation continue normally
      */}
      <NotifPermissionPrimer
        visible={showNotifPrimer}
        onAllow={handleNotifAllow}
        onDismiss={
          handleNotifDismiss
        }
      />
    </>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppIntro from '../screens/auth/AppIntro';
import GetStarted from '../screens/auth/GetStarted';
import SignIn from '../screens/auth/SignIn';
import SignUp from '../screens/auth/SignUp';
import VerifyOTP from '../screens/auth/VerifyOTP';
import TabNavigator from './TabNavigator';
import { supabase } from '../services/supabase';
import { touchLastSeen } from '../services/authService';
import { finalizePendingProfile } from '../features/auth/services/pendingProfile';

const GET_STARTED_SEEN_KEY = 'get_started_seen';
type Phase = 'splash' | 'auth' | 'getstarted' | 'main';
const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const [phase, setPhase] = useState<Phase>('splash');
  const phaseRef = useRef<Phase>('splash');
  const processingUserRef = useRef<string | null>(null);

  function transitionTo(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  async function finishSignedInUser(user: any) {
    if (!user?.id || processingUserRef.current === user.id) return;
    processingUserRef.current = user.id;
    try {
      try {
        await finalizePendingProfile(user.email ?? '', user.id);
      } catch (error) {
        console.warn('Profile setup could not be completed:', error);
      }

      try {
        const meta = user.user_metadata ?? {};
        const fullName: string = meta.full_name ?? meta.name ?? '';
        const firstName = meta.first_name || fullName.split(' ')[0] || '';
        const lastName = meta.last_name || fullName.split(' ').slice(1).join(' ') || '';
        const avatarUrl = meta.avatar_url ?? meta.picture ?? null;
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email ?? '',
          first_name: firstName,
          last_name: lastName,
          profile_picture: avatarUrl,
          status: 'active',
          role: 'user',
        }, { onConflict: 'id', ignoreDuplicates: false });
      } catch (error) {
        console.warn('User row upsert skipped:', error);
      }

      touchLastSeen(user.id).catch(() => {});
      const seen = await AsyncStorage.getItem(GET_STARTED_SEEN_KEY).catch(() => null);
      transitionTo(seen === 'true' ? 'main' : 'getstarted');
    } finally {
      processingUserRef.current = null;
    }
  }

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getAllKeys().then(keys => {
      const legacy = keys.filter(k => k.startsWith('onboarded_'));
      if (legacy.length) AsyncStorage.multiRemove(legacy).catch(() => {});
    }).catch(() => {});
    AsyncStorage.removeItem('device_onboarded').catch(() => {});

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && !session?.user?.email_confirmed_at) return;

      if (session?.user) {
        // Important: never await Supabase queries inside onAuthStateChange.
        // setSession() waits for this callback to finish, so awaiting another
        // Supabase request here can leave Google OAuth stuck on its spinner.
        const user = session.user;
        setTimeout(() => {
          if (mounted) finishSignedInUser(user).catch(error => console.warn('Post-login setup failed:', error));
        }, 0);
      } else if (phaseRef.current !== 'splash') {
        transitionTo('auth');
      }
    });

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.getSession().then(({ data }) => {
          const uid = data.session?.user?.id;
          if (uid) touchLastSeen(uid).catch(() => {});
        });
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const handleIntroDone = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    const confirmed = session?.user?.email_confirmed_at ? session : null;
    if (confirmed?.user) {
      touchLastSeen(confirmed.user.id).catch(() => {});
      const seen = await AsyncStorage.getItem(GET_STARTED_SEEN_KEY).catch(() => null);
      transitionTo(seen === 'true' ? 'main' : 'getstarted');
    } else {
      transitionTo('auth');
    }
  };

  const handleGetStartedDone = async () => {
    await AsyncStorage.setItem(GET_STARTED_SEEN_KEY, 'true').catch(() => {});
    transitionTo('main');
  };

  return (
    <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false, animation: 'fade' }}>
      {phase === 'splash' ? (
        <Stack.Screen name="AppIntro">{props => <AppIntro {...props} onDone={handleIntroDone} />}</Stack.Screen>
      ) : phase === 'auth' ? (
        <>
          <Stack.Screen name="SignIn" component={SignIn} />
          <Stack.Screen name="SignUp" component={SignUp} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
        </>
      ) : phase === 'getstarted' ? (
        <Stack.Screen name="GetStarted">{props => <GetStarted {...props} onOnboardingComplete={handleGetStartedDone} />}</Stack.Screen>
      ) : (
        <Stack.Screen name="Main" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
}

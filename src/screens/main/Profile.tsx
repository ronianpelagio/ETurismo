import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';

import { supabase } from '../../services/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { THEMES } from '../../constants/themes';
import {
  STORAGE_KEYS,
  getStringArray,
} from '../../utils/storage';


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_picture: string | null;
};


// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────

function buildC(t: typeof THEMES[keyof typeof THEMES]) {
  return {
    bg: t.bg,
    surface: t.surface,
    raised: t.raised,
    deep: t.deep,

    ink: t.ink,
    inkMid: t.inkMid,
    inkDim: t.inkDim,

    gold: t.gold,
    goldBright: t.goldBright,
    goldSoft: t.goldSoft,
    borderGold: t.borderGold,

    border: t.border,
    crimson: t.crimson,
    teal: t.teal,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export default function Profile({
  navigation,
  setNavbarVisible,
}: any) {
  const insets = useSafeAreaInsets();

  const { theme } = useAppTheme();
  const C = buildC(theme);

  const { fontScale } = useAppContext();

  // Profile
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stats
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [exploredCount, setExploredCount] = useState(0);
  const [totalArtifacts, setTotalArtifacts] = useState(0);

  // Avatar
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Animation
  const progressAnim = useRef(new Animated.Value(0)).current;


  // ───────────────────────────────────────────────────────────────────────────
  // CALCULATED VALUES
  // ───────────────────────────────────────────────────────────────────────────

  const safeExploredCount =
    totalArtifacts > 0
      ? Math.min(exploredCount, totalArtifacts)
      : exploredCount;

  const progress =
    totalArtifacts > 0
      ? Math.min(safeExploredCount / totalArtifacts, 1)
      : 0;

  const progressPercent = Math.round(progress * 100);

  const tourComplete =
    totalArtifacts > 0 &&
    safeExploredCount >= totalArtifacts;


  // ───────────────────────────────────────────────────────────────────────────
  // FOCUS
  // ───────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      setNavbarVisible?.(true);

      fetchStats();

      return () => {
        setNavbarVisible?.(false);
      };
    }, [setNavbarVisible])
  );


  // ───────────────────────────────────────────────────────────────────────────
  // PROFILE REALTIME
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let channel: any;
    let mounted = true;

    const start = async () => {
      await fetchUser();

      const {
        data: { user: auth },
      } = await supabase.auth.getUser();

      if (!auth || !mounted) return;

      channel = supabase
        .channel(`profile-${auth.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${auth.id}`,
          },
          payload => {
            const updated = payload.new as UserProfile;

            console.log('[Profile Realtime] Updated');

            setUser(prev =>
              prev
                ? { ...prev, ...updated }
                : updated
            );

            setAvatarUri(updated.profile_picture || null);
          }
        )
        .subscribe(status => {
          console.log('[Profile Realtime]:', status);
        });
    };

    start();

    return () => {
      mounted = false;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);


  // ───────────────────────────────────────────────────────────────────────────
  // PROGRESS ANIMATION
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 650,
      useNativeDriver: false,
    }).start();
  }, [progress]);


  // ───────────────────────────────────────────────────────────────────────────
  // FETCH PROFILE
  // ───────────────────────────────────────────────────────────────────────────

  async function fetchUser() {
    setLoading(true);
    setLoadError(null);

    try {
      const {
        data: { user: auth },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!auth) {
        throw new Error('No authenticated user found.');
      }

      const {
        data,
        error,
      } = await supabase
        .from('users')
        .select(
          'id, first_name, last_name, email, phone, profile_picture'
        )
        .eq('id', auth.id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setUser(data);
        setAvatarUri(data.profile_picture || null);
      }
    } catch (error: any) {
      console.warn(
        '[Profile] Fetch error:',
        error?.message
      );

      setLoadError(
        'Unable to load your profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }


  // ───────────────────────────────────────────────────────────────────────────
  // FETCH PROFILE STATS
  // ───────────────────────────────────────────────────────────────────────────

  async function fetchStats() {
    try {
      // Favorites
      const favorites = await getStringArray(
        STORAGE_KEYS.favoriteArtifacts
      );

      setFavoriteCount(favorites.length);

      // Scanned / explored artifacts
      const storedScans =
        await AsyncStorageSafeGet('scannedArtifacts');

      let scanned: any[] = [];

      if (storedScans) {
        try {
          const parsed = JSON.parse(storedScans);

          if (Array.isArray(parsed)) {
            scanned = parsed;
          }
        } catch {
          scanned = [];
        }
      }

      // Make sure duplicate artifacts aren't counted twice
      const uniqueScannedIds = new Set(
        scanned
          .map(item => item?.id)
          .filter(Boolean)
      );

      setExploredCount(uniqueScannedIds.size);

      // Total artifacts
      const {
        count,
        error,
      } = await supabase
        .from('artifacts')
        .select('id', {
          count: 'exact',
          head: true,
        });

      if (error) {
        throw error;
      }

      setTotalArtifacts(count ?? 0);
    } catch (error: any) {
      console.warn(
        '[Profile] Stats error:',
        error?.message
      );
    }
  }


  // ───────────────────────────────────────────────────────────────────────────
  // REFRESH
  // ───────────────────────────────────────────────────────────────────────────

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await Promise.all([
        fetchUser(),
        fetchStats(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }


  // ───────────────────────────────────────────────────────────────────────────
  // AVATAR
  // ───────────────────────────────────────────────────────────────────────────

  async function handlePickAvatar() {
    if (uploadingAvatar) return;

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const uri = result.assets[0].uri;

      await uploadAvatar(uri);
    } catch (error: any) {
      console.warn(
        '[Profile] Image picker:',
        error?.message
      );

      Alert.alert(
        'Photo Error',
        'Unable to open your photo library.'
      );
    }
  }


  async function uploadAvatar(uri: string) {
    setUploadingAvatar(true);

    try {
      const {
        data: { user: auth },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!auth) {
        throw new Error('Not authenticated');
      }

      // Resize/compress before upload
      const resized =
        await ImageManipulator.manipulateAsync(
          uri,
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
              ImageManipulator.SaveFormat.JPEG,
          }
        );

      const fileName =
        `${auth.id}/avatar.jpg`;

      const response =
        await fetch(resized.uri);

      const imageData =
        await response.arrayBuffer();

      // Upload to Storage
      const {
        error: uploadError,
      } = await supabase.storage
        .from('profile-pictures')
        .upload(
          fileName,
          imageData,
          {
            upsert: true,
            contentType: 'image/jpeg',
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      // Get URL
      const { data: urlData } =
        supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);

      const publicUrl =
        `${urlData.publicUrl}?v=${Date.now()}`;

      // Update profile
      const {
        error: updateError,
      } = await supabase
        .from('users')
        .update({
          profile_picture: publicUrl,
        })
        .eq('id', auth.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUri(publicUrl);

      setUser(prev =>
        prev
          ? {
              ...prev,
              profile_picture: publicUrl,
            }
          : prev
      );
    } catch (error: any) {
      console.warn(
        '[Profile] Avatar upload:',
        error?.message
      );

      Alert.alert(
        'Upload Failed',
        error?.message ||
          'Could not save your profile photo. Please try again.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  }


  // ───────────────────────────────────────────────────────────────────────────
  // AVATAR OPTIONS
  // ───────────────────────────────────────────────────────────────────────────

  function handleAvatarPress() {
    if (uploadingAvatar) return;

    Alert.alert(
      'Profile Photo',
      'Choose an option',
      [
        {
          text: 'Change Photo',
          onPress: handlePickAvatar,
        },

        ...(avatarUri
          ? [
              {
                text: 'Remove Photo',
                style: 'destructive' as const,
                onPress: removeAvatar,
              },
            ]
          : []),

        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }


  async function removeAvatar() {
    setUploadingAvatar(true);

    try {
      const {
        data: { user: auth },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth) {
        throw new Error('Not authenticated');
      }

      const fileName =
        `${auth.id}/avatar.jpg`;

      // Remove Storage object.
      // Ignore "not found" style failures because the
      // database value is the important part.
      const {
        error: storageError,
      } = await supabase.storage
        .from('profile-pictures')
        .remove([fileName]);

      if (storageError) {
        console.warn(
          '[Profile] Avatar storage removal:',
          storageError.message
        );
      }

      const {
        error: updateError,
      } = await supabase
        .from('users')
        .update({
          profile_picture: null,
        })
        .eq('id', auth.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUri(null);

      setUser(prev =>
        prev
          ? {
              ...prev,
              profile_picture: null,
            }
          : prev
      );
    } catch (error: any) {
      console.warn(
        '[Profile] Remove avatar:',
        error?.message
      );

      Alert.alert(
        'Unable to Remove Photo',
        error?.message ||
          'Please try again.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  }


  // ───────────────────────────────────────────────────────────────────────────
  // INITIALS
  // ───────────────────────────────────────────────────────────────────────────

  const firstInitial =
    user?.first_name?.trim()?.[0] ?? '';

  const lastInitial =
    user?.last_name?.trim()?.[0] ?? '';

  const initials =
    `${firstInitial}${lastInitial}`
      .toUpperCase() || '?';


  // ───────────────────────────────────────────────────────────────────────────
  // STYLES
  // ───────────────────────────────────────────────────────────────────────────

  const s = StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: C.bg,
    },

    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: C.bg,
      paddingHorizontal: 30,
    },

    scroll: {
      paddingBottom: 60,
    },

    // ── Loading ──────────────────────────────────────────────────────────────

    loadingText: {
      color: C.inkMid,
      fontSize: 13,
      marginTop: 14,
    },

    // ── Error ────────────────────────────────────────────────────────────────

    errorIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.goldSoft,
      marginBottom: 18,
    },

    errorTitle: {
      color: C.ink,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
    },

    errorMessage: {
      color: C.inkMid,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 7,
      marginBottom: 20,
    },

    retryBtn: {
      backgroundColor: C.ink,
      paddingHorizontal: 28,
      paddingVertical: 13,
      borderRadius: 50,
    },

    retryText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 13,
    },

    // ── Hero ─────────────────────────────────────────────────────────────────

    hero: {
      paddingBottom: 30,
      overflow: 'hidden',
      position: 'relative',
    },

    heroOrb1: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor:
        'rgba(199,168,75,0.07)',
    },

    heroOrb2: {
      position: 'absolute',
      bottom: -50,
      left: -50,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor:
        'rgba(199,168,75,0.04)',
    },

    heroInner: {
      alignItems: 'center',
      paddingTop: 30,
      paddingHorizontal: 24,
      paddingBottom: 5,
    },

    heroGoldLine: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor:
        'rgba(199,168,75,0.20)',
    },

    // ── Settings ─────────────────────────────────────────────────────────────

    settingsBtn: {
      position: 'absolute',
      top: 16,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        'rgba(255,255,255,0.07)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor:
        'rgba(255,255,255,0.12)',
    },

    // ── Avatar ───────────────────────────────────────────────────────────────

    avatarWrap: {
      position: 'relative',
      marginBottom: 18,
    },

    avatarRing: {
      width: 112,
      height: 112,
      borderRadius: 56,
      padding: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },

    avatarInner: {
      width: 106,
      height: 106,
      borderRadius: 53,
      backgroundColor: '#2C2720',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },

    avatarImg: {
      width: '100%',
      height: '100%',
    },

    avatarInitials: {
      fontSize: 38,
      fontWeight: '800',
      color: C.gold,
    },

    avatarEditBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: C.gold,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: '#1E1B17',
    },

    avatarUploadOverlay: { 
      borderRadius: 53,
      backgroundColor:
        'rgba(0,0,0,0.50)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Member ───────────────────────────────────────────────────────────────

    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor:
        'rgba(199,168,75,0.10)',
      borderWidth: 1,
      borderColor:
        'rgba(199,168,75,0.22)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      marginBottom: 12,
    },

    heroBadgeDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: C.gold,
    },

    heroBadgeTxt: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 2,
      color: C.gold,
    },

    heroName: {
      fontSize: 30,
      fontWeight: '900',
      color: '#FFFCF8',
      letterSpacing: -0.5,
      lineHeight: 36,
      textAlign: 'center',
    },

    heroSub: {
      fontSize: 12,
      color:
        'rgba(255,252,248,0.48)',
      marginTop: 5,
    },

    // ── Stats ────────────────────────────────────────────────────────────────

    statsRow: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',

      elevation: 3,

      shadowColor: C.ink,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    statCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 17,
      gap: 4,
    },

    statDivider: {
      width: 1,
      backgroundColor: C.border,
      marginVertical: 14,
    },

    statIconBox: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: C.goldSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },

    statNum: {
      fontSize: 21,
      fontWeight: '900',
      color: C.ink,
    },

    statLbl: {
      fontSize: 8.5,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: C.inkDim,
    },

    // ── Section ──────────────────────────────────────────────────────────────

    section: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },

    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },

    sectionDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: C.gold,
    },

    sectionLbl: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 2.5,
      color: C.gold,
    },

    sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: C.border,
    },

    // ── Journey ──────────────────────────────────────────────────────────────

    journeyCard: {
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: tourComplete
        ? C.borderGold
        : C.border,
      padding: 18,

      shadowColor: C.ink,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 3,
      },
    },

    journeyTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    achievementIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: C.goldSoft,
      borderWidth: 1,
      borderColor: C.borderGold,
      alignItems: 'center',
      justifyContent: 'center',
    },

    journeyText: {
      flex: 1,
    },

    journeyTitle: {
      color: C.ink,
      fontSize: 15,
      fontWeight: '800',
    },

    journeySub: {
      color: C.inkMid,
      fontSize: 11.5,
      marginTop: 3,
      lineHeight: 17,
    },

    percentage: {
      color: C.gold,
      fontSize: 17,
      fontWeight: '900',
    },

    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: C.border,
      overflow: 'hidden',
      marginTop: 18,
    },

    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: C.gold,
    },

    journeyBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 11,
    },

    journeyProgressText: {
      color: C.inkDim,
      fontSize: 10.5,
      fontWeight: '600',
    },

    journeyAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },

    journeyActionText: {
      color: C.gold,
      fontSize: 11,
      fontWeight: '700',
    },

    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: C.goldSoft,
      borderRadius: 12,
      paddingHorizontal: 11,
      paddingVertical: 8,
      marginTop: 15,
      alignSelf: 'flex-start',
    },

    completedText: {
      color: C.gold,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },

    // ── Menu ─────────────────────────────────────────────────────────────────

    menuCard: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },

    // ── Version ──────────────────────────────────────────────────────────────

    version: {
      textAlign: 'center',
      fontSize: 10,
      color: C.inkDim,
      marginTop: 30,
      letterSpacing: 0.5,
    },
  });


  // ───────────────────────────────────────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────────────────────────────────────

  if (loading && !user) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar style="auto" />

        <View style={s.center}>
          <ActivityIndicator
            size="large"
            color={C.gold}
          />

          <Text style={s.loadingText}>
            Loading your profile…
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // ───────────────────────────────────────────────────────────────────────────
  // ERROR
  // ───────────────────────────────────────────────────────────────────────────

  if (loadError && !user) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar style="auto" />

        <View style={s.center}>
          <View style={s.errorIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={32}
              color={C.gold}
            />
          </View>

          <Text style={s.errorTitle}>
            Profile Unavailable
          </Text>

          <Text style={s.errorMessage}>
            {loadError}
          </Text>

          <TouchableOpacity
            style={s.retryBtn}
            onPress={fetchUser}
            activeOpacity={0.8}
          >
            <Text style={s.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  // ───────────────────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={s.safe}
      edges={['top']}
    >
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          {
            paddingBottom:
              90 + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.gold}
          />
        }
      >

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* HERO */}
        {/* ────────────────────────────────────────────────────────────────── */}

        <View style={s.hero}>
          <LinearGradient
            colors={[
              '#1E1B17',
              '#29241E',
              '#342D24',
            ]}
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 1,
            }}
            style={StyleSheet.absoluteFill}
          />

          <View style={s.heroOrb1} />
          <View style={s.heroOrb2} />
          <View style={s.heroGoldLine} />

          <TouchableOpacity
            style={s.settingsBtn}
            onPress={() =>
              navigation?.navigate?.(
                'SettingsRoot'
              )
            }
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color="rgba(255,255,255,0.75)"
            />
          </TouchableOpacity>


          <View style={s.heroInner}>

            {/* Avatar */}

            <TouchableOpacity
              style={s.avatarWrap}
              onPress={handleAvatarPress}
              activeOpacity={0.9}
              disabled={uploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <LinearGradient
                colors={[
                  C.gold,
                  C.goldBright,
                  '#B8922E',
                ]}
                style={s.avatarRing}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
              >
                <View style={s.avatarInner}>
                  {avatarUri ? (
                    <Image
                      source={{
                        uri: avatarUri,
                      }}
                      style={s.avatarImg}
                    />
                  ) : (
                    <Text
                      style={s.avatarInitials}
                    >
                      {initials}
                    </Text>
                  )}

                  {uploadingAvatar && (
                    <View
                      style={
                        s.avatarUploadOverlay
                      }
                    >
                      <ActivityIndicator
                        color="#fff"
                      />
                    </View>
                  )}
                </View>
              </LinearGradient>

              <View style={s.avatarEditBtn}>
                <Ionicons
                  name="camera"
                  size={15}
                  color="#1A1510"
                />
              </View>
            </TouchableOpacity>


            {/* Member */}

            <View style={s.heroBadge}>
              <View
                style={s.heroBadgeDot}
              />

              <Text
                style={s.heroBadgeTxt}
              >
                SACRED HERITAGE MEMBER
              </Text>
            </View>


            {/* Name */}

            <Text
              style={[
                s.heroName,
                {
                  fontSize:
                    30 * fontScale,
                },
              ]}
            >
              {user?.first_name}{' '}
              {user?.last_name}
            </Text>

            <Text style={s.heroSub}>
              {user?.email}
            </Text>
          </View>
        </View>


        {/* ────────────────────────────────────────────────────────────────── */}
        {/* REAL STATS */}
        {/* ────────────────────────────────────────────────────────────────── */}

        <View style={s.statsRow}>

          <TouchableOpacity
            style={s.statCell}
            activeOpacity={0.7}
            onPress={() =>
              navigation?.navigate?.(
                'FavoriteArtifacts'
              )
            }
          >
            <View style={s.statIconBox}>
              <Ionicons
                name="heart-outline"
                size={16}
                color={C.gold}
              />
            </View>

            <Text style={s.statNum}>
              {favoriteCount}
            </Text>

            <Text style={s.statLbl}>
              FAVORITES
            </Text>
          </TouchableOpacity>


          <View style={s.statDivider} />


          <TouchableOpacity
            style={s.statCell}
            activeOpacity={0.7}
            onPress={() =>
              navigation?.navigate?.(
                'CollectionPage'
              )
            }
          >
            <View style={s.statIconBox}>
              <Ionicons
                name="scan-outline"
                size={16}
                color={C.gold}
              />
            </View>

            <Text style={s.statNum}>
              {safeExploredCount}
              {totalArtifacts > 0
                ? `/${totalArtifacts}`
                : ''}
            </Text>

            <Text style={s.statLbl}>
              EXPLORED
            </Text>
          </TouchableOpacity>


          <View style={s.statDivider} />


          <TouchableOpacity
            style={s.statCell}
            activeOpacity={0.7}
            onPress={() =>
              navigation?.navigate?.(
                'VisitHistory'
              )
            }
          >
            <View style={s.statIconBox}>
              <Ionicons
                name="time-outline"
                size={16}
                color={C.gold}
              />
            </View>

            <Text style={s.statNum}>
              {safeExploredCount}
            </Text>

            <Text style={s.statLbl}>
              HISTORY
            </Text>
          </TouchableOpacity>

        </View>


        {/* ────────────────────────────────────────────────────────────────── */}
        {/* HERITAGE JOURNEY */}
        {/* ────────────────────────────────────────────────────────────────── */}

        <View style={s.section}>

          <View style={s.sectionHead}>
            <View style={s.sectionDot} />

            <Text style={s.sectionLbl}>
              YOUR HERITAGE JOURNEY
            </Text>

            <View style={s.sectionLine} />
          </View>


          <TouchableOpacity
            style={s.journeyCard}
            activeOpacity={0.85}
            onPress={() =>
              navigation?.navigate?.(
                'CollectionPage'
              )
            }
          >
            <View style={s.journeyTop}>

              <View
                style={s.achievementIcon}
              >
                <Ionicons
                  name={
                    tourComplete
                      ? 'ribbon'
                      : 'map-outline'
                  }
                  size={23}
                  color={C.gold}
                />
              </View>


              <View style={s.journeyText}>
                <Text
                  style={s.journeyTitle}
                >
                  {tourComplete
                    ? 'Sacred Heritage Explorer'
                    : 'Continue Your Journey'}
                </Text>

                <Text
                  style={s.journeySub}
                >
                  {tourComplete
                    ? 'You have discovered every artifact in the collection.'
                    : totalArtifacts > 0
                    ? `${Math.max(
                        totalArtifacts -
                          safeExploredCount,
                        0
                      )} artifact${
                        totalArtifacts -
                          safeExploredCount ===
                        1
                          ? ''
                          : 's'
                      } left to discover.`
                    : 'Scan artifact QR codes to begin your heritage journey.'}
                </Text>
              </View>


              <Text style={s.percentage}>
                {progressPercent}%
              </Text>
            </View>


            <View style={s.progressTrack}>
              <Animated.View
                style={[
                  s.progressFill,
                  {
                    width:
                      progressAnim.interpolate(
                        {
                          inputRange: [
                            0,
                            1,
                          ],
                          outputRange: [
                            '0%',
                            '100%',
                          ],
                        }
                      ),
                  },
                ]}
              />
            </View>


            <View style={s.journeyBottom}>
              <Text
                style={
                  s.journeyProgressText
                }
              >
                {safeExploredCount} of{' '}
                {totalArtifacts} artifacts
                explored
              </Text>

              {!tourComplete && (
                <View
                  style={
                    s.journeyAction
                  }
                >
                  <Text
                    style={
                      s.journeyActionText
                    }
                  >
                    Explore
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={13}
                    color={C.gold}
                  />
                </View>
              )}
            </View>


            {tourComplete && (
              <View
                style={s.completedBadge}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={C.gold}
                />

                <Text
                  style={s.completedText}
                >
                  TOUR COMPLETED
                </Text>
              </View>
            )}

          </TouchableOpacity>
        </View>


        {/* ────────────────────────────────────────────────────────────────── */}
        {/* MY COLLECTION */}
        {/* ────────────────────────────────────────────────────────────────── */}

        <View style={s.section}>

          <View style={s.sectionHead}>
            <View style={s.sectionDot} />

            <Text style={s.sectionLbl}>
              MY COLLECTION
            </Text>

            <View style={s.sectionLine} />
          </View>


          <View style={s.menuCard}>

            <MenuRow
              icon="heart"
              label="Favorite Artifacts"
              sub={
                favoriteCount > 0
                  ? `${favoriteCount} favorite artifact${
                      favoriteCount !== 1
                        ? 's'
                        : ''
                    }`
                  : 'No favorites yet'
              }
              badge={
                favoriteCount ||
                undefined
              }
              onPress={() =>
                navigation?.navigate?.(
                  'FavoriteArtifacts'
                )
              }
              C={C}
            />


            <MenuRow
              icon="library-outline"
              label="Full Collection"
              sub={
                totalArtifacts > 0
                  ? `${totalArtifacts} artifacts in the collection`
                  : 'Browse all artifacts'
              }
              onPress={() =>
                navigation?.navigate?.(
                  'CollectionPage'
                )
              }
              C={C}
              isLast
            />

          </View>
        </View>


        {/* ────────────────────────────────────────────────────────────────── */}
        {/* ACCOUNT */}
        {/* ────────────────────────────────────────────────────────────────── */}

        <View style={s.section}>

          <View style={s.sectionHead}>
            <View style={s.sectionDot} />

            <Text style={s.sectionLbl}>
              ACCOUNT
            </Text>

            <View style={s.sectionLine} />
          </View>


          <View style={s.menuCard}>

            <MenuRow
              icon="time-outline"
              label="Visit History"
              sub={
                safeExploredCount > 0
                  ? `${safeExploredCount} artifact${
                      safeExploredCount !== 1
                        ? 's'
                        : ''
                    } explored`
                  : "Artifacts you've explored"
              }
              onPress={() =>
                navigation?.navigate?.(
                  'VisitHistory'
                )
              }
              C={C}
            />


            <MenuRow
              icon="settings-outline"
              label="Settings & Preferences"
              sub="Theme, language, notifications"
              onPress={() =>
                navigation?.navigate?.(
                  'SettingsRoot'
                )
              }
              C={C}
              isLast
            />

          </View>
        </View>


        <Text style={s.version}>
          ETurismo · Version 2.0.0
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// SAFE ASYNC STORAGE IMPORT
//
// Kept as a tiny helper so the Profile stats can read the same
// "scannedArtifacts" history already used by QRScanner.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

async function AsyncStorageSafeGet(
  key: string
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error: any) {
    console.warn(
      '[Profile] AsyncStorage read:',
      error?.message
    );

    return null;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// MENU ROW
// ─────────────────────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  sub,
  badge,
  onPress,
  isLast = false,
  C,
}: {
  icon: string;
  label: string;
  sub?: string;
  badge?: number;
  onPress: () => void;
  isLast?: boolean;
  C: any;
}) {
  const scale =
    useRef(
      new Animated.Value(1)
    ).current;


  const press = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
        duration: 70,
        useNativeDriver: true,
      }),

      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };


  const rowStyles = StyleSheet.create({
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 15,
      gap: 14,

      borderBottomWidth:
        isLast ? 0 : 1,

      borderBottomColor:
        C.border,
    },

    menuIconBox: {
      width: 38,
      height: 38,
      borderRadius: 11,

      backgroundColor:
        C.goldSoft,

      borderWidth: 1,
      borderColor:
        C.borderGold,

      alignItems: 'center',
      justifyContent: 'center',
    },

    menuTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: C.ink,
      marginBottom: 1,
    },

    menuSub: {
      fontSize: 11,
      color: C.inkDim,
    },

    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    menuBadge: {
      backgroundColor: C.gold,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
      minWidth: 22,
      alignItems: 'center',
    },

    menuBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFF',
    },
  });


  return (
    <Animated.View
      style={{
        transform: [
          {
            scale,
          },
        ],
      }}
    >
      <TouchableOpacity
        style={rowStyles.menuItem}
        onPress={press}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View
          style={rowStyles.menuIconBox}
        >
          <Ionicons
            name={icon as any}
            size={19}
            color={C.gold}
          />
        </View>


        <View style={{ flex: 1 }}>
          <Text
            style={rowStyles.menuTitle}
          >
            {label}
          </Text>

          {!!sub && (
            <Text
              style={rowStyles.menuSub}
            >
              {sub}
            </Text>
          )}
        </View>


        <View style={rowStyles.right}>
          {!!badge && (
            <View
              style={
                rowStyles.menuBadge
              }
            >
              <Text
                style={
                  rowStyles.menuBadgeText
                }
              >
                {badge}
              </Text>
            </View>
          )}

          <Ionicons
            name="chevron-forward"
            size={15}
            color={C.goldBright}
          />
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function AppIntro({ onDone }: any) {
  // Clean, short splash animation — inspired by modern banking-app intros.
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoTranslateY = useRef(new Animated.Value(18)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let exitTimer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

      // Hold the logo briefly, then hand control back to the navigator.
    exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.035,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted && onDone) onDone();
      });
    }, 2300);

    return () => {
      isMounted = false;
      clearTimeout(exitTimer);
    };
  }, [onDone]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F7F4EF"
        translucent={false}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          {/* Very subtle gold halo — keeps the focus on the actual logo. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                opacity: glowOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  { translateY: logoTranslateY },
                  { scale: logoScale },
                ],
              },
            ]}
          >
            <Image
              // Replace icon.png with your final ETURISMO logo if needed.
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Small brand accent at the bottom, similar to minimalist app splash screens. */}
        <View style={styles.bottomMark}>
          <View style={styles.bottomLine} />
          <View style={styles.bottomDot} />
          <View style={styles.bottomLine} />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EF',
  },

  safeArea: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoContainer: {
    width: Math.min(width * 0.92, 420),
    height: Math.min(width * 0.92, 420),
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  halo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 38,
    elevation: 0,
  },

  bottomMark: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  bottomLine: {
    width: 34,
    height: 1,
    backgroundColor: 'rgba(26, 22, 18, 0.12)',
  },

  bottomDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C9A84C',
  },
});
  
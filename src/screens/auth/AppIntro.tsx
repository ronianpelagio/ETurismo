import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AppIntro({ navigation, onOnboardingComplete }: any) {
  // Main animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoSlideUp = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Text reveal animations
  const titleSlide = useRef(new Animated.Value(30)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(20)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  
  // Decorative elements
  const lineWidth = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const goldShimmer = useRef(new Animated.Value(-width)).current;
  
  // Background gradient animation
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stage 1: Background & Logo entrance (0-800ms)
    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoSlideUp, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 20000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();

    // Stage 2: Title & Line reveal (400-1200ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(lineWidth, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(goldShimmer, {
          toValue: width * 2,
          duration: 1500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Stage 3: Subtitle reveal (800-1600ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);

    // Stage 4: Tagline & dots reveal (1200-2000ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1300);

    // Auto navigate after all animations complete
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onOnboardingComplete) {
          onOnboardingComplete();
        } else {
          navigation.replace('SignIn');
        }
      });
    }, 3200);

    return () => clearTimeout(timer);
  }, [navigation]);

  const lineWidthInterpolated = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shimmerInterpolate = goldShimmer.interpolate({
    inputRange: [-width, 0, width, width * 2],
    outputRange: [-width, -width, width, width],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Animated Background Gradient - Warm Light Theme */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={['#FFFCF8', '#FDF8F0', '#F7F4EF', '#FFFCF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Animated Orbs - Soft Gold */}
      <AnimatedOrb 
        size={350} 
        color="rgba(201, 168, 76, 0.04)" 
        style={{ top: -150, right: -100, transform: [{ rotate: rotateInterpolate }] }}
      />
      <AnimatedOrb 
        size={300} 
        color="rgba(201, 168, 76, 0.03)" 
        style={{ bottom: -100, left: -80, transform: [{ rotate: rotateInterpolate }] }}
      />
      <AnimatedOrb 
        size={250} 
        color="rgba(201, 168, 76, 0.05)" 
        style={{ top: '40%', right: -60, transform: [{ rotate: rotateInterpolate }] }}
      />

      {/* Floating Particles Effect - Gold */}
      <View style={styles.particlesContainer}>
        {[...Array(40)].map((_, i) => (
          <Particle key={i} delay={i * 60} />
        ))}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          
          {/* Logo Section with Image */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: logoSlideUp },
                ],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <View style={styles.logoGlow} />
              <LinearGradient
                colors={['rgba(201, 168, 76, 0.15)', 'rgba(201, 168, 76, 0)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.logo}>
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Animated.View>

          {/* Title Section */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: titleFade,
                transform: [{ translateY: titleSlide }],
              },
            ]}
          >
            <Text style={styles.appName}>
              <Text style={styles.appNameGold}>Dolores</Text>
            </Text>
            
            <View style={styles.dividerContainer}>
              <View style={styles.dividerDotGold} />
              <View style={styles.dividerLineContainer}>
                <View style={styles.dividerLine} />
                <Animated.View 
                  style={[
                    styles.dividerShimmer,
                    { transform: [{ translateX: shimmerInterpolate }] },
                  ]} 
                />
              </View>
              <View style={styles.dividerDotGold} />
            </View>
          </Animated.View>

          {/* Subtitle Section */}
          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                opacity: subtitleFade,
                transform: [{ translateY: subtitleSlide }],
              },
            ]}
          >
            <Text style={styles.subtitle}>
              Sacred Heritage Collection
            </Text>
          </Animated.View>

          {/* Tagline Section */}
          <Animated.View
            style={[
              styles.taglineContainer,
              {
                opacity: taglineFade,
                transform: [{ translateY: taglineSlide }],
              },
            ]}
          >
            <Text style={styles.tagline}>
              Explore sacred artifacts • Immersive audio guides • Virtual tours
            </Text>
          </Animated.View>

          {/* Bottom Loading Indicator */}
          <Animated.View style={[styles.loadingContainer, { opacity: dotOpacity }]}>
            <View style={styles.loadingDots}>
              <View style={[styles.loadingDot, styles.loadingDotActive]} />
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
            </View>
            <Text style={styles.loadingText}>Preparing your sacred journey...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Animated Orb Component
function AnimatedOrb({ size, color, style }: any) {
  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// Floating Particle Component
function Particle({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -180,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: Math.random() * 100 - 50,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
          left: `${Math.random() * 100}%`,
          top: `${60 + Math.random() * 40}%`,
        },
      ]}
    />
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  
  // Orbs
  orb: {
    position: 'absolute',
  },
  
  // Particles
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#C9A84C',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    transform: [{ scale: 1.3 }],
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
  },

  // Title
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 52,
    fontWeight: '800',
    color: '#1A1612',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 60,
  },
  appNameGold: {
    color: '#C9A84C',
    fontWeight: '800',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  dividerDotGold: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9A84C',
  },
  dividerLineContainer: {
    width: 100,
    height: 2,
    marginHorizontal: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  dividerLine: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
  },
  dividerShimmer: {
    position: 'absolute',
    width: 50,
    height: '100%',
    backgroundColor: '#C9A84C',
    opacity: 0.4,
  },

  // Subtitle
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B6459',
    textAlign: 'center',
    letterSpacing: 0.8,
  },

  // Tagline
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  tagline: {
    fontSize: 13,
    color: '#A89F96',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  // Loading Indicator
  loadingContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(201, 168, 76, 0.3)',
  },
  loadingDotActive: {
    backgroundColor: '#C9A84C',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 11,
    color: '#A89F96',
    letterSpacing: 1,
    fontWeight: '500',
  },
});
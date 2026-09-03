import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  bg: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#1A1612',
  inkMid: '#6B6459',
  inkLight: '#A89F96',
  gold: '#C9A84C',
  goldSoft: '#F5EDD8',
  goldDark: '#B8922E',
  border: '#EAE4DA',
};

const PAGES = [
  {
    eyebrow: 'Sacred Spaces',
    title: 'Explore\nSacred Places',
    sub: 'Discover churches, artifacts, and heritage sites from anywhere in the world.',
    image: require('../../assets/1.jpeg'),
    icon: 'compass',
  },
  {
    eyebrow: 'Always Available',
    title: 'Works Offline\n& Online',
    sub: 'Access the full collection even without an internet connection.',
    image: require('../../assets/1.jpeg'),
    icon: 'cloud',
  },
  {
    eyebrow: 'Digital Artifacts',
    title: 'Experience\nDigital Museum',
    sub: 'View artifacts up close with detailed descriptions and immersive audio guides.',
    image: require('../../assets/1.jpeg'),
    icon: 'cpu',
  },
];

export default function GetStarted({ navigation, onOnboardingComplete }: any) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewHorizontalRef = useRef<ScrollView>(null);
  
  // Content fade animations
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  
  // Dot animations — PAGES has exactly 3 items; declare refs statically to obey Rules of Hooks
  const dotScales = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];
  const dotOpacities = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.4)).current,
  ];
  
  // Entrance animation
  const entranceY = useRef(new Animated.Value(30)).current;
  const entranceOp = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceY, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(entranceOp, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const goToPage = (index: number) => {
    if (isAnimating || index === page) return;
    setIsAnimating(true);
    
    // Scroll to the page
    scrollViewHorizontalRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    
    // Animate content fade out/in
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(imageScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setPage(index);
      
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(imageScale, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    });
    
    // Animate dots
    PAGES.forEach((_, i) => {
      Animated.spring(dotScales[i], {
        toValue: i === index ? 1.2 : 1,
        useNativeDriver: true,
        tension: 200,
        friction: 12,
      }).start();
      
      Animated.timing(dotOpacities[i], {
        toValue: i === index ? 1 : 0.4,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleNext = () => {
    if (page < PAGES.length - 1) {
      goToPage(page + 1);
    } else {
      Animated.parallel([
        Animated.timing(entranceOp, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        onOnboardingComplete && onOnboardingComplete();
      });
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newPage = Math.round(offsetX / SCREEN_WIDTH);
    if (newPage !== page && !isAnimating) {
      setPage(newPage);
      
      // Update dots
      PAGES.forEach((_, i) => {
        Animated.spring(dotScales[i], {
          toValue: i === newPage ? 1.2 : 1,
          useNativeDriver: true,
          tension: 200,
          friction: 12,
        }).start();
        
        Animated.timing(dotOpacities[i], {
          toValue: i === newPage ? 1 : 0.4,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const isLast = page === PAGES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Background Gradient */}
      <LinearGradient
        colors={[C.bg, C.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeTop} />
      <View style={styles.decorativeBottom} />

      {/* Skip Button */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skip, { top: insets.top + 16 }]}
          onPress={() => {
            Animated.parallel([
              Animated.timing(entranceOp, { toValue: 0, duration: 300, useNativeDriver: true }),
              Animated.timing(buttonScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
            ]).start(() => onOnboardingComplete && onOnboardingComplete());
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Feather name="chevron-right" size={12} color={C.inkMid} />
        </TouchableOpacity>
      )}

      {/* Image Slider */}
      <ScrollView
        ref={scrollViewHorizontalRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={styles.slider}
        contentContainerStyle={styles.sliderContent}
      >
        {PAGES.map((p, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.imageWrapper}>
              <Animated.View
                style={[
                  styles.imageCard,
                  { transform: [{ scale: i === page ? imageScale : 1 }] },
                ]}
              >
                <Image source={p.image} style={styles.image} resizeMode="cover" />
                <View style={styles.imageOverlayContainer}>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)', C.gold]}
                    style={styles.imageOverlay}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>
                <View style={styles.imageFrame} />
              </Animated.View>

              {/* Page Badge */}
              <View style={styles.pageBadge}>
                <Feather name={p.icon as any} size={18} color={C.surface} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Text Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: Animated.multiply(entranceOp, contentOpacity),
            transform: [{ translateY: entranceY }],
          },
        ]}
      >
        <View style={styles.eyebrowContainer}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{PAGES[page].eyebrow}</Text>
        </View>

        <Text style={styles.title}>{PAGES[page].title}</Text>

        <View style={styles.goldLineContainer}>
          <View style={styles.goldLine} />
          <View style={styles.goldLineShort} />
        </View>

        <Text style={styles.sub}>{PAGES[page].sub}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goToPage(i)}
              activeOpacity={0.7}
              disabled={isAnimating}
            >
              <Animated.View
                style={[
                  styles.dot,
                  {
                    transform: [{ scale: dotScales[i] }],
                    opacity: dotOpacities[i],
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom Actions */}
      <Animated.View
        style={[
          styles.bottom,
          {
            paddingBottom: insets.bottom + 24,
            transform: [{ scale: buttonScale }],
            opacity: entranceOp,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handleNext}
          activeOpacity={0.85}
          disabled={isAnimating}
        >
          <View style={styles.buttonGradientWrapper}>
            <LinearGradient
              colors={[C.ink, '#2D2D2D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            />
          </View>
          <Text style={styles.buttonText}>{isLast ? 'Begin Journey' : 'Next'}</Text>
        </TouchableOpacity>

        {!isLast && (
          <View style={styles.stepRow}>
            <View style={styles.stepProgress}>
              <View
                style={[
                  styles.stepProgressFill,
                  { width: `${((page + 1) / PAGES.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.stepText}>
              {page + 1} / {PAGES.length}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Decorative elements
  decorativeTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.goldSoft,
    opacity: 0.5,
  },
  decorativeBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: C.goldSoft,
    opacity: 0.3,
  },

  // Skip button
  skip: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMid,
    letterSpacing: 0.5,
  },

  // Slider
  slider: {
    flexGrow: 0,
    marginTop: Platform.OS === 'ios' ? 20 : 40,
  },
  sliderContent: {
    alignItems: 'center',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imageCard: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_HEIGHT * 0.38,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlayContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  imageOverlay: {
    flex: 1,
  },
  imageFrame: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  pageBadge: {
    position: 'absolute',
    bottom: -12,
    right: 32,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Content
  content: {
    paddingHorizontal: 28,
    marginTop: 24,
  },
  eyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: C.gold,
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: C.ink,
    lineHeight: 42,
    letterSpacing: -1,
  },
  goldLineContainer: {
    marginTop: 16,
    marginBottom: 14,
  },
  goldLine: {
    width: 48,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginBottom: 6,
  },
  goldLineShort: {
    width: 24,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    opacity: 0.4,
  },
  sub: {
    fontSize: 15,
    color: C.inkMid,
    lineHeight: 22,
    letterSpacing: 0.2,
  },

  // Dots
  dotsContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
  },

  // Bottom
  bottom: {
    paddingHorizontal: 28,
    marginTop: 20,
  },
  button: {
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: C.ink,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  buttonGradientWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  buttonGradient: {
    flex: 1,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  buttonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  stepProgress: {
    flex: 1,
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: 'hidden',
    maxWidth: 100,
  },
  stepProgressFill: {
    height: '100%',
    backgroundColor: C.gold,
    borderRadius: 2,
  },
  stepText: {
    fontSize: 12,
    color: C.inkLight,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});
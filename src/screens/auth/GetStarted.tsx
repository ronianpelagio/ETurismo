import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    accent: '#C9A84C',
  },
  {
    eyebrow: 'Living History',
    title: 'Journey\nThrough Time',
    sub: 'Walk through centuries of culture, tradition, and spirituality preserved for you.',
    image: require('../../assets/1.jpeg'),
    icon: 'clock',
    accent: '#A07840',
  },
  {
    eyebrow: 'Digital Artifacts',
    title: 'Experience\nDigital Museum',
    sub: 'View artifacts up close with detailed descriptions and immersive audio guides.',
    image: require('../../assets/1.jpeg'),
    icon: 'cpu',
    accent: '#C9A84C',
  },
];

// ─── Per-page content animation refs (staggered entrance) ───────────────────
type AnimRefs = {
  eyebrowY: Animated.Value;
  eyebrowOp: Animated.Value;
  titleY: Animated.Value;
  titleOp: Animated.Value;
  lineW: Animated.Value;
  subY: Animated.Value;
  subOp: Animated.Value;
};

function makePageAnimRefs(): AnimRefs {
  return {
    eyebrowY: new Animated.Value(20),
    eyebrowOp: new Animated.Value(0),
    titleY: new Animated.Value(28),
    titleOp: new Animated.Value(0),
    lineW: new Animated.Value(0),
    subY: new Animated.Value(20),
    subOp: new Animated.Value(0),
  };
}

function runPageEntrance(refs: AnimRefs) {
  Animated.sequence([
    Animated.parallel([
      Animated.timing(refs.eyebrowOp, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(refs.eyebrowY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]),
    Animated.parallel([
      Animated.timing(refs.titleOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(refs.titleY, { toValue: 0, tension: 90, friction: 14, useNativeDriver: true }),
    ]),
    Animated.parallel([
      Animated.timing(refs.lineW, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]),
    Animated.parallel([
      Animated.timing(refs.subOp, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(refs.subY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]),
  ]).start();
}

function resetPageAnimRefs(refs: AnimRefs) {
  refs.eyebrowY.setValue(20);
  refs.eyebrowOp.setValue(0);
  refs.titleY.setValue(28);
  refs.titleOp.setValue(0);
  refs.lineW.setValue(0);
  refs.subY.setValue(20);
  refs.subOp.setValue(0);
}

export default function GetStarted({ navigation, onOnboardingComplete }: any) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Badge bounce animation
  const badgeBounce = useRef(new Animated.Value(0)).current;

  // Dot animations — exactly 3, declared statically (Rules of Hooks)
  const dotScales = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];
  const dotWidths = [
    useRef(new Animated.Value(24)).current,
    useRef(new Animated.Value(6)).current,
    useRef(new Animated.Value(6)).current,
  ];

  // Per-page staggered text animations
  const pageAnims = useRef<AnimRefs[]>(PAGES.map(() => makePageAnimRefs())).current;

  // Global entrance (screen mount)
  const screenOp = useRef(new Animated.Value(0)).current;
  const screenY = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Screen entrance
    Animated.parallel([
      Animated.timing(screenOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(screenY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();

    // Start badge bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeBounce, { toValue: -6, duration: 700, useNativeDriver: true }),
        Animated.timing(badgeBounce, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // First page text entrance
    runPageEntrance(pageAnims[0]);
  }, []);

  const animateDots = (index: number) => {
    PAGES.forEach((_, i) => {
      Animated.spring(dotScales[i], {
        toValue: i === index ? 1.1 : 1,
        useNativeDriver: true,
        tension: 200,
        friction: 12,
      }).start();
      Animated.timing(dotWidths[i], {
        toValue: i === index ? 24 : 6,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
  };

  const goToPage = (index: number) => {
    if (isAnimating || index === page) return;
    setIsAnimating(true);

    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });

    resetPageAnimRefs(pageAnims[index]);
    animateDots(index);
    setPage(index);

    setTimeout(() => {
      runPageEntrance(pageAnims[index]);
      setIsAnimating(false);
    }, 180);
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newPage = Math.round(offsetX / SCREEN_WIDTH);
    if (newPage !== page && !isAnimating && newPage >= 0 && newPage < PAGES.length) {
      resetPageAnimRefs(pageAnims[newPage]);
      animateDots(newPage);
      setPage(newPage);
      setTimeout(() => runPageEntrance(pageAnims[newPage]), 60);
    }
  };

  const handleNext = () => {
    if (page < PAGES.length - 1) {
      goToPage(page + 1);
    } else {
      Animated.parallel([
        Animated.timing(screenOp, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        onOnboardingComplete && onOnboardingComplete();
      });
    }
  };

  const isLast = page === PAGES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Background */}
      <LinearGradient
        colors={[C.bg, C.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={styles.decorativeTop} />
      <View style={styles.decorativeBottom} />

      {/* Skip */}
      {!isLast && (
        <Animated.View style={[styles.skipWrap, { top: insets.top + 16, opacity: screenOp }]}>
          <TouchableOpacity
            style={styles.skip}
            onPress={() => {
              Animated.timing(screenOp, { toValue: 0, duration: 250, useNativeDriver: true }).start(
                () => onOnboardingComplete && onOnboardingComplete()
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
            <Feather name="chevron-right" size={12} color={C.inkMid} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Image Slider ─────────────────────────────────────────────────── */}
      <View style={[styles.sliderWrapper, { paddingTop: insets.top + 56 }]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false, listener: handleScroll }
          )}
          style={styles.slider}
          contentContainerStyle={styles.sliderContent}
        >
          {PAGES.map((p, i) => {
            // Parallax: image shifts slightly as the slide scrolls in/out
            const inputRange = [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ];
            const translateX = scrollX.interpolate({
              inputRange,
              outputRange: [-30, 0, 30],
              extrapolate: 'clamp',
            });
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1, 0.9],
              extrapolate: 'clamp',
            });
            const cardOp = scrollX.interpolate({
              inputRange,
              outputRange: [0.6, 1, 0.6],
              extrapolate: 'clamp',
            });

            return (
              <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
                <Animated.View style={[styles.imageCard, { opacity: cardOp, transform: [{ scale }] }]}>
                  <Animated.Image
                    source={p.image}
                    style={[styles.image, { transform: [{ translateX }] }]}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.25)', p.accent + 'CC']}
                    style={styles.imageOverlay}
                    start={{ x: 0, y: 0.4 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View style={styles.imageFrame} />
                </Animated.View>

                {/* Badge — bounces on the active page */}
                <Animated.View
                  style={[
                    styles.pageBadge,
                    { backgroundColor: p.accent },
                    i === page
                      ? { transform: [{ translateY: badgeBounce }] }
                      : undefined,
                  ]}
                >
                  <Feather name={p.icon as any} size={18} color={C.surface} />
                </Animated.View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Bottom Panel ─────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.bottomPanel,
          { paddingBottom: insets.bottom + 20, opacity: screenOp, transform: [{ translateY: screenY }] },
        ]}
      >
        {/* Text block — staggered per page */}
        <View style={styles.content}>
          <Animated.View
            style={{
              opacity: pageAnims[page].eyebrowOp,
              transform: [{ translateY: pageAnims[page].eyebrowY }],
            }}
          >
            <View style={styles.eyebrowContainer}>
              <View style={[styles.eyebrowDot, { backgroundColor: PAGES[page].accent }]} />
              <Text style={[styles.eyebrow, { color: PAGES[page].accent }]}>
                {PAGES[page].eyebrow}
              </Text>
            </View>
          </Animated.View>

          <Animated.Text
            style={[
              styles.title,
              {
                opacity: pageAnims[page].titleOp,
                transform: [{ translateY: pageAnims[page].titleY }],
              },
            ]}
          >
            {PAGES[page].title}
          </Animated.Text>

          <View style={styles.goldLineContainer}>
            <Animated.View
              style={[
                styles.goldLine,
                {
                  backgroundColor: PAGES[page].accent,
                  transform: [
                    {
                      scaleX: pageAnims[page].lineW,
                    },
                  ],
                  transformOrigin: 'left',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.goldLineShort,
                {
                  backgroundColor: PAGES[page].accent,
                  opacity: pageAnims[page].lineW,
                },
              ]}
            />
          </View>

          <Animated.Text
            style={[
              styles.sub,
              {
                opacity: pageAnims[page].subOp,
                transform: [{ translateY: pageAnims[page].subY }],
              },
            ]}
          >
            {PAGES[page].sub}
          </Animated.Text>
        </View>

        {/* Dots — pill shape for active */}
        <View style={styles.dotsContainer}>
          <View style={styles.dots}>
            {PAGES.map((p, i) => (
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
                      backgroundColor: i === page ? p.accent : C.border,
                      width: dotWidths[i],
                      transform: [{ scale: dotScales[i] }],
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Button */}
        <Animated.View style={[styles.buttonWrap, { transform: [{ scale: buttonScale }] }]}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            activeOpacity={0.85}
            disabled={isAnimating}
          >
            <LinearGradient
              colors={isLast ? [C.gold, C.goldDark] : [C.ink, '#2D2D2D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.buttonText, isLast && { color: C.ink }]}>
              {isLast ? 'Begin Journey' : 'Next'}
            </Text>
            <View style={[styles.buttonIcon, { backgroundColor: isLast ? C.ink : C.gold }]}>
              <Feather name={isLast ? 'arrow-right' : 'chevron-right'} size={14} color={C.surface} />
            </View>
          </TouchableOpacity>

          {/* Step progress */}
          <View style={styles.stepRow}>
            <View style={styles.stepTrack}>
              <Animated.View
                style={[
                  styles.stepFill,
                  { width: `${((page + 1) / PAGES.length) * 100}%`, backgroundColor: PAGES[page].accent },
                ]}
              />
            </View>
            <Text style={styles.stepText}>
              {page + 1} / {PAGES.length}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  decorativeTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.goldSoft,
    opacity: 0.5,
  },
  decorativeBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: C.goldSoft,
    opacity: 0.3,
  },

  // Skip
  skipWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
  },
  skip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMid,
    letterSpacing: 0.5,
  },

  // Slider
  sliderWrapper: {
    flex: 1,
  },
  slider: {
    flex: 1,
  },
  sliderContent: {
    alignItems: 'center',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCard: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_HEIGHT * 0.37,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13,
    shadowRadius: 28,
    elevation: 12,
  },
  image: {
    width: '110%',         // slightly wider to allow parallax travel
    height: '100%',
    marginLeft: '-5%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    bottom: -14,
    right: 36,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2,
    borderColor: C.surface,
  },

  // Bottom panel
  bottomPanel: {
    paddingHorizontal: 0,
  },

  // Content
  content: {
    paddingHorizontal: 28,
    marginTop: 30,
    marginBottom: 4,
  },
  eyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: C.ink,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  goldLineContainer: {
    marginTop: 14,
    marginBottom: 12,
    gap: 6,
  },
  goldLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
  },
  goldLineShort: {
    width: 24,
    height: 3,
    borderRadius: 2,
    opacity: 0.45,
  },
  sub: {
    fontSize: 14,
    color: C.inkMid,
    lineHeight: 22,
    letterSpacing: 0.15,
  },

  // Dots
  dotsContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 2,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // Button
  buttonWrap: {
    paddingHorizontal: 28,
    marginTop: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 10,
    overflow: 'hidden',
    shadowColor: C.ink,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    color: C.surface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Step progress
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  stepTrack: {
    flex: 1,
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepText: {
    fontSize: 12,
    color: C.inkLight,
    letterSpacing: 0.5,
    fontWeight: '500',
    minWidth: 32,
    textAlign: 'right',
  },
});

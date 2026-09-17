import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
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
    image: require('../../assets/onboarding-sacred-places.png'),
    imageAlt: 'A traveler approaching a historic Philippine stone church at sunrise',
    icon: 'compass' as const,
    accent: '#C9A84C',
  },
  {
    eyebrow: 'Living History',
    title: 'Journey\nThrough Time',
    sub: 'Walk through centuries of culture, tradition, and spirituality preserved for you.',
    image: require('../../assets/onboarding-living-history.png'),
    imageAlt: 'A visitor studying preserved artifacts inside a Philippine heritage museum',
    icon: 'clock' as const,
    accent: '#A07840',
  },
  {
    eyebrow: 'Digital Artifacts',
    title: 'Experience\nDigital Museum',
    sub: 'View artifacts up close with detailed descriptions and immersive audio guides.',
    image: require('../../assets/onboarding-digital-museum.png'),
    imageAlt: 'A visitor using a phone and audio guide to explore a museum artifact',
    icon: 'cpu' as const,
    accent: '#C9A84C',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DRIVER RULE: one Animated.Value → one driver type (native OR JS), never both.
//
//  useNativeDriver: true  → opacity, transform (translateX/Y, scale, rotate)
//  useNativeDriver: false → width, height, color, backgroundColor, borderRadius
//
// Never put a native-driven value and a JS-driven value on the SAME Animated.View.
// ─────────────────────────────────────────────────────────────────────────────

// Per-page text entrance refs — ALL native-driver (opacity + translateY only)
type PageAnimRefs = {
  eyebrowOp: Animated.Value;   // native
  eyebrowY:  Animated.Value;   // native
  titleOp:   Animated.Value;   // native
  titleY:    Animated.Value;   // native
  subOp:     Animated.Value;   // native
  subY:      Animated.Value;   // native
};

// Gold line refs — ALL JS-driver (width + opacity are layout props)
type LineAnimRefs = {
  lineW:  Animated.Value;   // JS  — width 0 → 48
  lineOp: Animated.Value;   // JS  — opacity 0 → 0.45 (short line)
};

const LINE_FULL = 48;

function makePageAnimRefs(): PageAnimRefs {
  return {
    eyebrowOp: new Animated.Value(0),
    eyebrowY:  new Animated.Value(20),
    titleOp:   new Animated.Value(0),
    titleY:    new Animated.Value(28),
    subOp:     new Animated.Value(0),
    subY:      new Animated.Value(20),
  };
}

function makeLineAnimRefs(): LineAnimRefs {
  return {
    lineW:  new Animated.Value(0),
    lineOp: new Animated.Value(0),
  };
}

function resetPageAnimRefs(p: PageAnimRefs, l: LineAnimRefs) {
  p.eyebrowOp.setValue(0);
  p.eyebrowY.setValue(20);
  p.titleOp.setValue(0);
  p.titleY.setValue(28);
  p.subOp.setValue(0);
  p.subY.setValue(20);
  l.lineW.setValue(0);
  l.lineOp.setValue(0);
}

function runPageEntrance(p: PageAnimRefs, l: LineAnimRefs) {
  // Native-driver sequence for text
  Animated.sequence([
    Animated.parallel([
      Animated.timing(p.eyebrowOp, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(p.eyebrowY,  { toValue: 0, duration: 280, useNativeDriver: true }),
    ]),
    Animated.parallel([
      Animated.timing(p.titleOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring( p.titleY,  { toValue: 0, tension: 90, friction: 14, useNativeDriver: true }),
    ]),
    Animated.parallel([
      Animated.timing(p.subOp, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(p.subY,  { toValue: 0, duration: 280, useNativeDriver: true }),
    ]),
  ]).start();

  // JS-driver sequence for gold lines (runs independently, slight delay)
  setTimeout(() => {
    Animated.sequence([
      Animated.timing(l.lineW,  { toValue: LINE_FULL, duration: 320, useNativeDriver: false }),
      Animated.timing(l.lineOp, { toValue: 0.45,      duration: 200, useNativeDriver: false }),
    ]).start();
  }, 280); // starts after eyebrow+title are in
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GetStarted({ onOnboardingComplete }: any) {
  const insets = useSafeAreaInsets();
  const [page, setPage]           = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const scrollX      = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Badge bounce — native driver (translateY)
  const badgeBounce = useRef(new Animated.Value(0)).current;

  // Dot WIDTH — JS driver (layout prop), one per dot
  const dotWidths = useRef([
    new Animated.Value(24),
    new Animated.Value(6),
    new Animated.Value(6),
  ]).current;

  // Per-page animation refs, split by driver type
  const pageAnims = useRef<PageAnimRefs[]>(PAGES.map(() => makePageAnimRefs())).current;
  const lineAnims = useRef<LineAnimRefs[]>(PAGES.map(() => makeLineAnimRefs())).current;

  // Screen entrance — native driver
  const screenOp    = useRef(new Animated.Value(0)).current;
  const screenY     = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOp,    { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring( screenY,    { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.spring( buttonScale,{ toValue: 1, tension: 50, friction: 8,  useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeBounce, { toValue: -6, duration: 700, useNativeDriver: true }),
        Animated.timing(badgeBounce, { toValue: 0,  duration: 700, useNativeDriver: true }),
      ])
    ).start();

    runPageEntrance(pageAnims[0], lineAnims[0]);
  }, []);

  const animateDots = (index: number) => {
    dotWidths.forEach((w, i) => {
      // JS driver only — no scale, no native props here
      Animated.timing(w, {
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
    resetPageAnimRefs(pageAnims[index], lineAnims[index]);
    animateDots(index);
    setPage(index);
    setTimeout(() => {
      runPageEntrance(pageAnims[index], lineAnims[index]);
      setIsAnimating(false);
    }, 180);
  };

  const handleMomentumScrollEnd = (event: any) => {
    const newPage = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newPage !== page && newPage >= 0 && newPage < PAGES.length) {
      resetPageAnimRefs(pageAnims[newPage], lineAnims[newPage]);
      animateDots(newPage);
      setPage(newPage);
      runPageEntrance(pageAnims[newPage], lineAnims[newPage]);
    }
  };

  const handleNext = () => {
    if (page < PAGES.length - 1) {
      goToPage(page + 1);
    } else {
      Animated.parallel([
        Animated.timing(screenOp,    { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      ]).start(() => onOnboardingComplete?.());
    }
  };

  const isLast = page === PAGES.length - 1;
  const pa = pageAnims[page];
  const la = lineAnims[page];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <LinearGradient
        colors={[C.bg, C.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.decorativeTop} />
      <View style={styles.decorativeBottom} />

      {/* Skip button */}
      {!isLast && (
        <Animated.View style={[styles.skipWrap, { top: insets.top + 16, opacity: screenOp }]}>
          <TouchableOpacity
            style={styles.skip}
            activeOpacity={0.7}
            onPress={() =>
              Animated.timing(screenOp, { toValue: 0, duration: 250, useNativeDriver: true })
                .start(() => onOnboardingComplete?.())
            }
          >
            <Text style={styles.skipText}>Skip</Text>
            <Feather name="chevron-right" size={12} color={C.inkMid} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Slider ────────────────────────────────────────────────────────── */}
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
            { useNativeDriver: false }   // scrollX is JS-driver (used for layout interpolations)
          )}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          style={styles.slider}
          contentContainerStyle={styles.sliderContent}
        >
          {PAGES.map((p, i) => {
            const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
            // scrollX is JS-driver → all interpolations from it must stay JS-driver
            const translateX = scrollX.interpolate({ inputRange, outputRange: [-30, 0, 30], extrapolate: 'clamp' });
            const cardScale  = scrollX.interpolate({ inputRange, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
            const cardOp     = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });

            return (
              <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
                {/*
                  cardOp (opacity) and cardScale (scale/transform) both come from scrollX
                  which is JS-driver → this Animated.View is entirely JS-driver ✓
                */}
                <Animated.View
                  style={[styles.imageCard, { opacity: cardOp, transform: [{ scale: cardScale }] }]}
                >
                  <Animated.Image
                    source={p.image}
                    style={[styles.image, { transform: [{ translateX }] }]}
                    resizeMode="cover"
                    accessible
                    accessibilityLabel={p.imageAlt}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.25)', p.accent + 'CC']}
                    style={styles.imageOverlay}
                    start={{ x: 0, y: 0.4 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View style={styles.imageFrame} />
                </Animated.View>

                {/* Badge: translateY from badgeBounce (native-driver) — no other props animated ✓ */}
                <Animated.View
                  style={[
                    styles.pageBadge,
                    { backgroundColor: p.accent },
                    i === page ? { transform: [{ translateY: badgeBounce }] } : null,
                  ]}
                >
                  <Feather name={p.icon} size={18} color={C.surface} />
                </Animated.View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Bottom panel ──────────────────────────────────────────────────── */}
      {/*
        screenOp (opacity, native) + screenY (translateY, native) → both native ✓
      */}
      <Animated.View
        style={[
          styles.bottomPanel,
          { paddingBottom: insets.bottom + 20, opacity: screenOp, transform: [{ translateY: screenY }] },
        ]}
      >
        <View style={styles.content}>

          {/* Eyebrow: native opacity + native translateY → native-only Animated.View ✓ */}
          <Animated.View style={{ opacity: pa.eyebrowOp, transform: [{ translateY: pa.eyebrowY }] }}>
            <View style={styles.eyebrowRow}>
              <View style={[styles.eyebrowDot, { backgroundColor: PAGES[page].accent }]} />
              <Text style={[styles.eyebrow, { color: PAGES[page].accent }]}>
                {PAGES[page].eyebrow}
              </Text>
            </View>
          </Animated.View>

          {/* Title: native opacity + native translateY ✓ */}
          <Animated.Text
            style={[styles.title, { opacity: pa.titleOp, transform: [{ translateY: pa.titleY }] }]}
          >
            {PAGES[page].title}
          </Animated.Text>

          {/* Gold lines: JS-driver width/opacity — kept in plain Views, no native props ✓ */}
          <View style={styles.goldLineContainer}>
            <Animated.View
              style={[styles.goldLineBase, { backgroundColor: PAGES[page].accent, width: la.lineW }]}
            />
            <Animated.View
              style={[styles.goldLineShort, { backgroundColor: PAGES[page].accent, opacity: la.lineOp }]}
            />
          </View>

          {/* Sub: native opacity + native translateY ✓ */}
          <Animated.Text
            style={[styles.sub, { opacity: pa.subOp, transform: [{ translateY: pa.subY }] }]}
          >
            {PAGES[page].sub}
          </Animated.Text>
        </View>

        {/* Dots */}
        <View style={styles.dotsContainer}>
          <View style={styles.dots}>
            {PAGES.map((p, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => goToPage(i)}
                activeOpacity={0.7}
                disabled={isAnimating}
              >
                {/*
                  dotWidths[i] drives width → JS-driver only.
                  No scale/transform here at all → no driver conflict ✓
                */}
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === page ? p.accent : C.border,
                      width: dotWidths[i],
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Button: buttonScale is native-driver (transform scale only) ✓ */}
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

          <View style={styles.stepRow}>
            <View style={styles.stepTrack}>
              <View
                style={[
                  styles.stepFill,
                  { width: `${((page + 1) / PAGES.length) * 100}%`, backgroundColor: PAGES[page].accent },
                ]}
              />
            </View>
            <Text style={styles.stepText}>{page + 1} / {PAGES.length}</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  decorativeTop: {
    position: 'absolute', top: -100, right: -100,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.goldSoft, opacity: 0.5,
  },
  decorativeBottom: {
    position: 'absolute', bottom: -100, left: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: C.goldSoft, opacity: 0.3,
  },

  skipWrap: { position: 'absolute', right: 20, zIndex: 20 },
  skip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  skipText: { fontSize: 13, fontWeight: '600', color: C.inkMid, letterSpacing: 0.5 },

  sliderWrapper:  { flex: 1 },
  slider:         { flex: 1 },
  sliderContent:  { alignItems: 'center' },
  slide:          { flex: 1, alignItems: 'center', justifyContent: 'center' },

  imageCard: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_HEIGHT * 0.37,
    borderRadius: 28, overflow: 'hidden',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13, shadowRadius: 28, elevation: 12,
  },
  image:        { width: '110%', height: '100%', marginLeft: '-5%' as any },
  imageOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  imageFrame: {
    position: 'absolute', top: 12, left: 12, right: 12, bottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
  },
  pageBadge: {
    position: 'absolute', bottom: -14, right: 36,
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    borderWidth: 2, borderColor: C.surface,
  },

  bottomPanel: { paddingHorizontal: 0 },

  content:     { paddingHorizontal: 28, marginTop: 30, marginBottom: 4 },
  eyebrowRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eyebrowDot:  { width: 6, height: 6, borderRadius: 3 },
  eyebrow:     { fontSize: 11, letterSpacing: 2.5, fontWeight: '700', textTransform: 'uppercase' },
  title:       { fontSize: 34, fontWeight: '800', color: C.ink, lineHeight: 40, letterSpacing: -0.8 },

  goldLineContainer: { marginTop: 14, marginBottom: 12, gap: 6 },
  goldLineBase:      { height: 3, borderRadius: 2 },               // width is animated
  goldLineShort:     { width: 24, height: 3, borderRadius: 2 },    // opacity is animated

  sub: { fontSize: 14, color: C.inkMid, lineHeight: 22, letterSpacing: 0.15 },

  dotsContainer: { alignItems: 'center', marginTop: 20, marginBottom: 2 },
  dots: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1, borderColor: C.border,
  },
  dot: { height: 6, borderRadius: 3 },   // width is animated, nothing else

  buttonWrap: { paddingHorizontal: 28, marginTop: 14 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 16, gap: 10, overflow: 'hidden',
    shadowColor: C.ink, shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 6,
  },
  buttonText: { color: C.surface, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  buttonIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  stepRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingHorizontal: 4 },
  stepTrack:{ flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  stepFill: { height: '100%', borderRadius: 2 },
  stepText: { fontSize: 12, color: C.inkLight, letterSpacing: 0.5, fontWeight: '500', minWidth: 32, textAlign: 'right' },
});

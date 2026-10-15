import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

interface AppIntroProps {
  onReveal: () => Promise<void>;
  onDone: () => void;
}

const AnimatedView = Animated.View;
const AnimatedImage = Animated.Image;

const PAPER = '#F7F4EF';
const INK = '#191611';
const GOLD = '#B99345';
const STAGE_MAX = 320;
const FRAME_PADDING = 14;
const SCAN_BAND_HEIGHT = 38;

export default function AppIntro({
  onReveal,
  onDone,
}: AppIntroProps) {
  const { width, height } = useWindowDimensions();
  const [isRestoring, setIsRestoring] = useState(false);

  const callbacksRef = useRef({ onReveal, onDone });
  callbacksRef.current = { onReveal, onDone };
  const dimensionsRef = useRef({ width, height });
  dimensionsRef.current = { width, height };

  const qrOpacity = useRef(new Animated.Value(0)).current;
  const qrScale = useRef(new Animated.Value(0.88)).current;
  const qrTranslateY = useRef(new Animated.Value(12)).current;
  const frameProgress = useRef(new Animated.Value(0)).current;
  const scanProgress = useRef(new Animated.Value(0)).current;
  const lockProgress = useRef(new Animated.Value(0)).current;
  const edgeOpacity = useRef(new Animated.Value(0)).current;
  const paperOffset = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;

    const openingAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(qrOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(qrScale, {
          toValue: 1,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(qrTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(frameProgress, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scanProgress, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(lockProgress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const revealApp = () => {
      Animated.parallel([
        Animated.timing(brandOpacity, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(edgeOpacity, {
          toValue: 1,
          duration: 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(paperOffset, {
          toValue: dimensionsRef.current.height + 4,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && !cancelled) {
          callbacksRef.current.onDone();
        }
      });
    };

    openingAnimation.start(({ finished }) => {
      if (!finished || cancelled) {
        return;
      }

      setIsRestoring(true);
      void callbacksRef.current.onReveal().then(
        () => {
          if (!cancelled) {
            setIsRestoring(false);
            revealApp();
          }
        },
        (error: unknown) => {
          console.warn(
            '[AppIntro] Could not prepare the destination screen:',
            error,
          );
          if (!cancelled) {
            setIsRestoring(false);
            revealApp();
          }
        },
      );
    });

    return () => {
      cancelled = true;
      openingAnimation.stop();
      brandOpacity.stopAnimation();
      edgeOpacity.stopAnimation();
      paperOffset.stopAnimation();
    };
  }, [
    brandOpacity,
    edgeOpacity,
    frameProgress,
    lockProgress,
    paperOffset,
    qrOpacity,
    qrScale,
    qrTranslateY,
    scanProgress,
  ]);

  const stageSize = Math.min(STAGE_MAX, width - 64);
  const frameSize = stageSize + FRAME_PADDING * 2;

  const frameScaleIn = frameProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1.12, 1],
  });
  const frameScaleLock = lockProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.96],
  });
  const frameScale = Animated.multiply(frameScaleIn, frameScaleLock);

  const revealTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-stageSize, 0],
  });
  const logoCounterTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [stageSize, 0],
  });
  const scanTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCAN_BAND_HEIGHT, stageSize - SCAN_BAND_HEIGHT],
  });
  const scanOpacity = scanProgress.interpolate({
    inputRange: [0, 0.06, 0.94, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <AnimatedView
      pointerEvents="auto"
      style={styles.container}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={PAPER}
        translucent={false}
      />

      <AnimatedView
        pointerEvents="none"
        style={[
          styles.paper,
          { transform: [{ translateY: paperOffset }] },
        ]}
      >
        <AnimatedView style={[styles.edge, { opacity: edgeOpacity }]} />
      </AnimatedView>

      <AnimatedView
        pointerEvents="none"
        style={[
          styles.brand,
          {
            opacity: brandOpacity,
            transform: [{ scale: qrScale }],
          },
        ]}
      >
        <AnimatedView
          style={[
            styles.stage,
            {
              width: stageSize,
              height: stageSize,
              left: (width - stageSize) / 2,
              top: (height - stageSize) / 2,
              opacity: qrOpacity,
              transform: [{ translateY: qrTranslateY }],
            },
          ]}
        >
          <Image
            source={require('../../assets/intro-qr.png')}
            style={styles.fill}
            resizeMode="contain"
          />

          <AnimatedView
            style={[
              styles.reveal,
              { transform: [{ translateY: revealTranslateY }] },
            ]}
          >
            <AnimatedImage
              source={require('../../assets/intro-logo.png')}
              style={[
                styles.fill,
                { transform: [{ translateY: logoCounterTranslateY }] },
              ]}
              resizeMode="contain"
            />
          </AnimatedView>

          <AnimatedView
            style={[
              styles.scan,
              {
                opacity: scanOpacity,
                transform: [{ translateY: scanTranslateY }],
              },
            ]}
          >
            <View style={[styles.trail, { backgroundColor: 'rgba(185, 147, 69, 0.04)' }]} />
            <View style={[styles.trail, { backgroundColor: 'rgba(185, 147, 69, 0.08)' }]} />
            <View style={[styles.trail, { backgroundColor: 'rgba(185, 147, 69, 0.13)' }]} />
            <View style={[styles.trail, { backgroundColor: 'rgba(185, 147, 69, 0.2)' }]} />
            <View style={styles.scanLine} />
          </AnimatedView>
        </AnimatedView>

        <AnimatedView
          style={[
            styles.frame,
            {
              width: frameSize,
              height: frameSize,
              left: (width - frameSize) / 2,
              top: (height - frameSize) / 2,
              opacity: frameProgress,
              transform: [{ scale: frameScale }],
            },
          ]}
        >
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </AnimatedView>
      </AnimatedView>

      {isRestoring && (
        <View
          pointerEvents="none"
          style={styles.loading}
        >
          <ActivityIndicator
            size="small"
            color={GOLD}
            accessibilityLabel="Loading your account"
          />
          <Text style={styles.loadingText}>
            Preparing your experience
          </Text>
        </View>
      )}
    </AnimatedView>
  );
}

const CORNER_SIZE = 34;
const CORNER_WIDTH = 3;
const CORNER_RADIUS = 6;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    elevation: 10,
    overflow: 'hidden',
    backgroundColor: PAPER,
  },
  paper: {
    ...StyleSheet.absoluteFill,
    backgroundColor: PAPER,
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: INK,
  },
  brand: {
    ...StyleSheet.absoluteFill,
  },
  stage: {
    position: 'absolute',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  reveal: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: PAPER,
  },
  scan: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCAN_BAND_HEIGHT,
  },
  trail: {
    height: 9,
    backgroundColor: GOLD,
  },
  scanLine: {
    height: 2,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.7,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  frame: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: INK,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: CORNER_RADIUS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: CORNER_RADIUS,
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#6E665B',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});

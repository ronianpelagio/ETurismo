/**
 * ArtifactAudioPlayer
 *
 * Spotify-style audio player for artifact audio guides.
 * Features: album-art thumbnail, track label, interactive scrub bar,
 * current / total time, skip ±10 s, playback-speed pills (0.75 / 1 / 1.5 / 2×),
 * animated waveform bars while playing.
 *
 * Props
 * ─────
 *  audioUrl      – URL of the audio file to play
 *  imageUrl      – artifact thumbnail shown inside the player
 *  trackLabel    – e.g. "English narration"
 *  isPlaying     – controlled: is this URL currently playing?
 *  currentTime   – seconds elapsed (from useAudioWordHighlight or own state)
 *  duration      – total seconds (0 before known)
 *  playbackRate  – current speed multiplier
 *  onPlay        – called when the user taps Play
 *  onPause       – called when the user taps Pause
 *  onSeek        – called with target seconds when user scrubs
 *  onSkip        – called with ±delta seconds
 *  onRateChange  – called with new rate
 *  C             – colour tokens (pass from parent's buildC)
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Accepts any theme token object — QRScanner, Home, and CollectionPage all
 * use slightly different key names, so we resolve each colour with a fallback
 * chain inside makeStyles() rather than requiring exact property names.
 */
export type PlayerColors = Record<string, string>;

export interface ArtifactAudioPlayerProps {
  audioUrl: string;
  imageUrl?: string | null;
  trackLabel: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (deltaSecs: number) => void;
  onRateChange: (rate: number) => void;
  C: PlayerColors;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

function Waveform({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  const heights = [0.45, 1, 0.65, 0.9, 0.55];
  const anims   = heights.map(h => useRef(new Animated.Value(h * 0.3)).current);

  useEffect(() => {
    if (!isPlaying) {
      anims.forEach((a, i) => Animated.timing(a, { toValue: heights[i] * 0.3, duration: 200, useNativeDriver: true }).start());
      return;
    }
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.timing(a, { toValue: heights[i],       duration: 350, useNativeDriver: true }),
          Animated.timing(a, { toValue: heights[i] * 0.3, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [isPlaying]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 18 }}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: 18,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ scaleY: anim }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Format helper ────────────────────────────────────────────────────────────

function fmt(s: number): string {
  if (!isFinite(s) || isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Speed pills ──────────────────────────────────────────────────────────────

const RATES = [0.75, 1, 1.5, 2] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export default function ArtifactAudioPlayer({
  audioUrl,
  imageUrl,
  trackLabel,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onSkip,
  onRateChange,
  C,
}: ArtifactAudioPlayerProps) {
  // Track bar layout width for translating touch → seconds
  const trackWidthRef = useRef(0);

  // PanResponder for interactive scrub bar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (evt) => {
        seekFromTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        seekFromTouch(evt.nativeEvent.locationX);
      },
    })
  ).current;

  function seekFromTouch(x: number) {
    if (!trackWidthRef.current || duration <= 0) return;
    const ratio   = Math.max(0, Math.min(x / trackWidthRef.current, 1));
    const seconds = ratio * duration;
    onSeek(seconds);
  }

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  };

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  // colours resolved — same fallback chains as makeStyles()
  const gold       = C.gold       ?? '#B99345';
  const inkMid     = C.inkMid     ?? '#6B6560';

  const s = makeStyles(C);

  return (
    <View style={[s.card, isPlaying && s.cardActive]}>

      {/* ── Top row: thumbnail + label + waveform ── */}
      <View style={s.topRow}>

        {/* Thumbnail */}
        <View style={s.thumb}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.thumbImg} resizeMode="cover" />
          ) : (
            <View style={[s.thumbImg, s.thumbFallback]}>
              <Ionicons name="musical-notes-outline" size={20} color={gold} />
            </View>
          )}
        </View>

        {/* Labels */}
        <View style={{ flex: 1 }}>
          <Text style={s.trackTitle} numberOfLines={1}>
            {isPlaying ? 'Now playing…' : 'Audio Guide'}
          </Text>
          <Text style={s.trackSub} numberOfLines={1}>{trackLabel}</Text>
        </View>

        {/* Play / Pause button */}
        <TouchableOpacity
          style={[s.playBtn, isPlaying && s.playBtnActive]}
          onPress={isPlaying ? onPause : onPlay}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={isPlaying ? '#FFF' : gold}
          />
        </TouchableOpacity>

        {/* Waveform — visible while playing */}
        {isPlaying && (
          <View style={{ marginLeft: 6 }}>
            <Waveform isPlaying color={gold} />
          </View>
        )}
      </View>

      {/* ── Progress section (always visible once a URL is set) ── */}
      <View style={s.progressSection}>

        {/* Scrub bar */}
        <View
          style={s.trackBar}
          onLayout={onTrackLayout}
          {...panResponder.panHandlers}
          hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
        >
          {/* Background */}
          <View style={s.trackBg} />
          {/* Fill */}
          <View style={[s.trackFill, { width: `${progress * 100}%` }]} />
          {/* Thumb dot */}
          <View style={[s.thumbDot, { left: `${progress * 100}%` }]} />
        </View>

        {/* Time labels */}
        <View style={s.timeRow}>
          <Text style={s.timeText}>{fmt(currentTime)}</Text>
          <Text style={s.timeText}>{fmt(duration)}</Text>
        </View>

        {/* Controls row */}
        <View style={s.controlsRow}>

          {/* Skip back */}
          <TouchableOpacity
            style={s.skipBtn}
            onPress={() => onSkip(-10)}
            activeOpacity={0.7}
            accessibilityLabel="Skip back 10 seconds"
          >
            <Ionicons name="play-back-outline" size={22} color={inkMid} />
            <Text style={s.skipLabel}>10s</Text>
          </TouchableOpacity>

          {/* Speed pills */}
          <View style={s.rateRow}>
            {RATES.map(r => (
              <TouchableOpacity
                key={r}
                style={[s.ratePill, playbackRate === r && s.ratePillActive]}
                onPress={() => onRateChange(r)}
                activeOpacity={0.75}
              >
                <Text style={[s.rateText, playbackRate === r && s.rateTextActive]}>
                  {r === 1 ? '1×' : `${r}×`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Skip forward */}
          <TouchableOpacity
            style={s.skipBtn}
            onPress={() => onSkip(10)}
            activeOpacity={0.7}
            accessibilityLabel="Skip forward 10 seconds"
          >
            <Ionicons name="play-forward-outline" size={22} color={inkMid} />
            <Text style={s.skipLabel}>10s</Text>
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(C: PlayerColors) {
  // Resolve colours with fallback chains so all three theme shapes work:
  //   QRScanner uses:  bg, surface, ink, inkMid, inkLight, gold, goldSoft, goldLight, border, borderGold
  //   Home uses:       void (≈bg), surface, ink, inkMid, inkDim (≈inkLight), gold, goldSoft, raised (≈surface), border, borderGold
  //   CollectionPage uses: bg, surface, ink, inkMid, inkLight, gold, goldSoft, border
  const bg         = C.bg        ?? C.void       ?? '#FFFDF9';
  const surface    = C.surface   ?? C.raised     ?? '#FFFFFF';
  const ink        = C.ink       ?? '#1A1612';
  const inkMid     = C.inkMid    ?? '#6B6560';
  const inkLight   = C.inkLight  ?? C.inkDim     ?? '#A09890';
  const gold       = C.gold      ?? '#B99345';
  const goldSoft   = C.goldSoft  ?? '#F5ECD9';
  const goldLight  = C.goldLight ?? C.goldSoft   ?? goldSoft;
  const border     = C.border    ?? '#E5DED2';
  const borderGold = C.borderGold ?? gold;

  return StyleSheet.create({
    card: {
      backgroundColor: bg,
      borderWidth: 1.5,
      borderColor: border,
      borderRadius: 20,
      padding: 16,
      gap: 14,
    },
    cardActive: {
      borderColor: borderGold,
      backgroundColor: goldLight,
    },

    // ── Top row ──
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    thumb: {
      width: 48,
      height: 48,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: borderGold,
    },
    thumbImg: {
      width: '100%',
      height: '100%',
    },
    thumbFallback: {
      backgroundColor: goldSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trackTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: ink,
      marginBottom: 2,
    },
    trackSub: {
      fontSize: 11,
      color: inkLight,
    },
    playBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: surface,
      borderWidth: 1.5,
      borderColor: borderGold,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playBtnActive: {
      backgroundColor: gold,
      borderColor: gold,
    },

    // ── Progress ──
    progressSection: {
      gap: 8,
    },
    trackBar: {
      height: 28,
      justifyContent: 'center',
      position: 'relative',
    },
    trackBg: {
      position: 'absolute',
      left: 0, right: 0,
      height: 5,
      backgroundColor: border,
      borderRadius: 3,
    },
    trackFill: {
      position: 'absolute',
      left: 0,
      height: 5,
      backgroundColor: gold,
      borderRadius: 3,
    },
    thumbDot: {
      position: 'absolute',
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: gold,
      marginLeft: -7,
      top: 7,
      shadowColor: gold,
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 3,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    timeText: {
      fontSize: 10,
      fontWeight: '600',
      color: inkLight,
    },

    // ── Controls ──
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    skipBtn: {
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    skipLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: inkMid,
      letterSpacing: 0.5,
    },
    rateRow: {
      flexDirection: 'row',
      gap: 6,
    },
    ratePill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: goldSoft,
      borderWidth: 1,
      borderColor: borderGold,
    },
    ratePillActive: {
      backgroundColor: gold,
      borderColor: gold,
    },
    rateText: {
      fontSize: 11,
      fontWeight: '700',
      color: inkMid,
    },
    rateTextActive: {
      color: '#FFF',
    },
  });
}

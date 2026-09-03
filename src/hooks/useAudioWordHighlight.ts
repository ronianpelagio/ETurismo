/**
 * useAudioWordHighlight
 *
 * A hook that drives word-level highlighting in sync with an audio narration.
 *
 * Strategy:
 *   - We split the description text into an array of words.
 *   - When audio starts, we record the start timestamp.
 *   - We poll the player's elapsed time with setInterval and map elapsed seconds
 *     → highlighted-word index using a simple linear model:
 *       wordsPerSecond = totalWords / audioDurationSeconds
 *   - When the description comes with explicit per-word timestamps (optional), we
 *     use those for more accurate sync.
 *
 * Usage:
 *   const { words, highlightedIndex, startHighlight, stopHighlight, resetHighlight } =
 *     useAudioWordHighlight({ text: description, durationSeconds: audioDuration });
 *
 *   In JSX, render each word with a highlighted style when index === highlightedIndex.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type WordTimestamp = {
  /** 0-based index of the word in the words array */
  index: number;
  /** seconds from audio start when this word should be highlighted */
  startTime: number;
};

type Options = {
  /** Full text to be narrated */
  text: string;
  /**
   * Total duration of the audio in seconds.
   * Used only for linear interpolation when no wordTimestamps are provided.
   */
  durationSeconds?: number;
  /**
   * Optional explicit per-word timestamps (more accurate).
   * If provided, durationSeconds is ignored.
   */
  wordTimestamps?: WordTimestamp[];
};

type AudioWordHighlightResult = {
  /** The text split into individual word strings */
  words: string[];
  /** Index of the currently highlighted word (−1 = nothing highlighted) */
  highlightedIndex: number;
  /** Call this when audio playback begins. Pass the player object (expo-audio) */
  startHighlight: (playerRef: any) => void;
  /** Call this when audio is stopped / paused */
  stopHighlight: () => void;
  /** Reset state (e.g. when modal closes) */
  resetHighlight: () => void;
};

/** Split text preserving punctuation-attached tokens as single visual words */
function splitWords(text: string): string[] {
  if (!text) return [];
  // Split on whitespace, keep empty filter
  return text.split(/\s+/).filter(Boolean);
}

/** Given elapsed seconds, return the word index via linear interpolation */
function linearWordIndex(
  elapsed: number,
  totalWords: number,
  durationSeconds: number,
): number {
  if (durationSeconds <= 0 || totalWords === 0) return -1;
  const ratio = Math.min(elapsed / durationSeconds, 1);
  return Math.min(Math.floor(ratio * totalWords), totalWords - 1);
}

/** Given elapsed seconds and explicit timestamps, find the current word index */
function timestampWordIndex(elapsed: number, timestamps: WordTimestamp[]): number {
  if (!timestamps.length) return -1;
  let current = -1;
  for (const ts of timestamps) {
    if (elapsed >= ts.startTime) {
      current = ts.index;
    } else {
      break;
    }
  }
  return current;
}

const POLL_INTERVAL_MS = 150; // how often we check player position (ms)

export function useAudioWordHighlight({
  text,
  durationSeconds = 0,
  wordTimestamps,
}: Options): AudioWordHighlightResult {
  const words = splitWords(text);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<any>(null);
  const startTimestampRef = useRef<number>(0); // wall-clock ms when play started
  const elapsedOffsetRef = useRef<number>(0);  // resume offset in seconds

  const stopHighlight = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetHighlight = useCallback(() => {
    stopHighlight();
    setHighlightedIndex(-1);
    elapsedOffsetRef.current = 0;
    playerRef.current = null;
  }, [stopHighlight]);

  const startHighlight = useCallback(
    (player: any) => {
      playerRef.current = player;
      startTimestampRef.current = Date.now();

      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        // Compute elapsed time from wall clock — works even if expo-audio
        // doesn't expose a reliable currentTime property synchronously.
        const wallElapsed = (Date.now() - startTimestampRef.current) / 1000 + elapsedOffsetRef.current;

        let idx: number;
        if (wordTimestamps && wordTimestamps.length > 0) {
          idx = timestampWordIndex(wallElapsed, wordTimestamps);
        } else {
          idx = linearWordIndex(wallElapsed, words.length, durationSeconds);
        }
        setHighlightedIndex(idx);

        // Stop polling if we've exceeded the duration (linear mode)
        if (
          !wordTimestamps &&
          durationSeconds > 0 &&
          wallElapsed >= durationSeconds
        ) {
          stopHighlight();
          // Keep the last word highlighted briefly, then reset
          setTimeout(() => setHighlightedIndex(-1), 800);
        }
      }, POLL_INTERVAL_MS);
    },
    [words.length, durationSeconds, wordTimestamps, stopHighlight],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { words, highlightedIndex, startHighlight, stopHighlight, resetHighlight };
}

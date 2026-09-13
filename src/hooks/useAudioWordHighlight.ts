/**
 * useAudioWordHighlight
 *
 * Drives word-level highlighting by reading player.currentTime directly
 * from the expo-audio AudioPlayer object. This gives exact sync with no
 * wall-clock drift and automatically stays correct after seeks or rate changes.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type WordTimestamp = {
  index: number;
  startTime: number; // seconds from audio start
};

type Options = {
  text: string;
  durationSeconds?: number;
  wordTimestamps?: WordTimestamp[];
};

type AudioWordHighlightResult = {
  words: string[];
  highlightedIndex: number;
  /** Current playback position in seconds — read directly from the player */
  currentTime: number;
  startHighlight: (player: any) => void;
  stopHighlight: () => void;
  resetHighlight: () => void;
};

function splitWords(text: string): string[] {
  if (!text) return [];
  return text.split(/\s+/).filter(Boolean);
}

function linearWordIndex(
  elapsed: number,
  totalWords: number,
  durationSeconds: number,
): number {
  if (durationSeconds <= 0 || totalWords === 0) return -1;
  const ratio = Math.min(elapsed / durationSeconds, 1);
  return Math.min(Math.floor(ratio * totalWords), totalWords - 1);
}

function timestampWordIndex(elapsed: number, timestamps: WordTimestamp[]): number {
  if (!timestamps.length) return -1;
  let current = -1;
  for (const ts of timestamps) {
    if (elapsed >= ts.startTime) current = ts.index;
    else break;
  }
  return current;
}

const POLL_MS = 100; // poll every 100 ms — fast enough to feel immediate

export function useAudioWordHighlight({
  text,
  durationSeconds = 0,
  wordTimestamps,
}: Options): AudioWordHighlightResult {
  const words = splitWords(text);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef   = useRef<any>(null);

  // Keep a ref to the latest durationSeconds so the interval closure always
  // uses the up-to-date value even after state updates.
  const durationRef      = useRef<number>(durationSeconds);
  const wordCountRef     = useRef<number>(words.length);
  const wordTimestampRef = useRef(wordTimestamps);

  // Sync refs whenever the values change (no stale closures)
  useEffect(() => { durationRef.current = durationSeconds; }, [durationSeconds]);
  useEffect(() => { wordCountRef.current = words.length; });
  useEffect(() => { wordTimestampRef.current = wordTimestamps; }, [wordTimestamps]);

  const stopHighlight = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetHighlight = useCallback(() => {
    stopHighlight();
    setHighlightedIndex(-1);
    setCurrentTime(0);
    playerRef.current = null;
  }, [stopHighlight]);

  const startHighlight = useCallback((player: any) => {
    // Store the player so the interval can read currentTime from it
    playerRef.current = player;

    // Clear any previous interval
    if (intervalRef.current !== null) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;

      // Read the real position directly from the player — no wall-clock math
      const elapsed: number =
        typeof p.currentTime === 'number' ? p.currentTime : 0;

      setCurrentTime(elapsed);

      const dur   = durationRef.current;
      const wc    = wordCountRef.current;
      const tsArr = wordTimestampRef.current;

      let idx: number;
      if (tsArr && tsArr.length > 0) {
        idx = timestampWordIndex(elapsed, tsArr);
      } else {
        idx = linearWordIndex(elapsed, wc, dur);
      }
      setHighlightedIndex(idx);

      // Auto-stop once we've passed the end
      if (!tsArr && dur > 0 && elapsed >= dur) {
        stopHighlight();
        setTimeout(() => setHighlightedIndex(-1), 600);
      }
    }, POLL_MS);
  }, [stopHighlight]); // stable — no captured state

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    words,
    highlightedIndex,
    currentTime,
    startHighlight,
    stopHighlight,
    resetHighlight,
  };
}

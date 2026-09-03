/**
 * HighlightedText
 *
 * Renders a passage of text where one word at a time is highlighted
 * (used for audio guide word-sync).
 *
 * Props:
 *   words           - array of word strings (from useAudioWordHighlight)
 *   highlightedIndex - index of the currently active word (−1 = none)
 *   textStyle       - base Text style
 *   highlightStyle  - style applied to the active word (override)
 *   highlightColor  - quick background tint (default: gold-ish amber)
 */

import React from 'react';
import { Text, View, StyleProp, TextStyle, ViewStyle } from 'react-native';

type Props = {
  words: string[];
  highlightedIndex: number;
  textStyle?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  highlightColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

const HighlightedText: React.FC<Props> = ({
  words,
  highlightedIndex,
  textStyle,
  highlightStyle,
  highlightColor = 'rgba(201,168,76,0.28)',
  containerStyle,
}) => {
  if (!words || words.length === 0) return null;

  return (
    <Text style={[{ lineHeight: 26, flexWrap: 'wrap' }, textStyle]}>
      {words.map((word, i) => {
        const isActive = i === highlightedIndex;
        return (
          <Text
            key={i}
            style={[
              isActive && {
                backgroundColor: highlightColor,
                borderRadius: 3,
                color: '#6B4C0C',
                fontWeight: '700',
              },
              isActive && highlightStyle,
            ]}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </Text>
        );
      })}
    </Text>
  );
};

export default HighlightedText;

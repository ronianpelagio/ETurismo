// src/screens/main/ratings_modal.tsx
// User ratings modal for artifacts.

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingsModalProps {
  visible: boolean;
  artifactId: string | null;
  artifactName?: string;
  onClose: () => void;
}

const C = {
  bg: '#FAF9F7',
  surface: '#FFFFFF',
  ink: '#1E1B17',
  inkMid: '#5C564B',
  inkDim: '#9B948A',
  gold: '#C7A84B',
  goldSoft: '#FDF8F0',
  border: '#EAE5DF',
  borderGold: 'rgba(199,168,75,0.25)',
};

export default function RatingsModal({
  visible,
  artifactName = 'Artifact',
  onClose,
}: RatingsModalProps) {
  const [rating, setRating] = React.useState(0);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>RATE THIS PIECE</Text>
              <Text style={styles.title}>{artifactName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={C.inkMid} />
            </TouchableOpacity>
          </View>

          <View style={styles.goldLine} />

          <ScrollView contentContainerStyle={styles.content}>
            {/* Star Rating */}
            <Text style={styles.sectionLabel}>YOUR RATING</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? C.gold : C.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {rating === 0
                ? 'Tap a star to rate'
                : rating === 5
                ? 'Exceptional!'
                : rating >= 4
                ? 'Very Good'
                : rating >= 3
                ? 'Good'
                : rating >= 2
                ? 'Fair'
                : 'Poor'}
            </Text>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
              onPress={rating > 0 ? onClose : undefined}
              disabled={rating === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnTxt}>Submit Rating</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(30,27,23,0.5)',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 3,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 4,
  },
  goldLine: {
    width: 40,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginBottom: 24,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 3,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: C.inkMid,
    fontWeight: '600',
    marginBottom: 32,
  },
  submitBtn: {
    backgroundColor: C.ink,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    width: '100%',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnTxt: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

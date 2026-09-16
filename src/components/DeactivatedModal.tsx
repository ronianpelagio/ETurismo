import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function DeactivatedModal({ visible, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 320, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fadeAnim }]} />

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 24, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.iconCircle}>
          <Ionicons name="ban-outline" size={40} color="#B63B32" />
        </View>

        <Text style={styles.eyebrow}>ACCOUNT STATUS</Text>
        <Text style={styles.title}>Account Deactivated</Text>
        <View style={styles.divider} />

        <Text style={styles.body}>
          Your account has been deactivated by an administrator.
        </Text>
        <Text style={styles.body}>
          If you believe this is a mistake or would like to appeal, please
          contact us at{' '}
          <Text style={styles.email}>support@eturismo.com</Text>.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleDismiss}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Dismiss deactivation notice"
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
          <Text style={styles.buttonText}>OK, I understand</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(10,8,6,0.82)',
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#FFCDD2',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 24,
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#FFF1EF',
    borderWidth: 2, borderColor: '#FFCDD2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#B63B32', shadowOpacity: 0.12, shadowRadius: 16, elevation: 4,
  },
  eyebrow: {
    fontSize: 9, fontWeight: '800', color: '#B63B32',
    letterSpacing: 3, marginBottom: 8,
  },
  title: {
    fontSize: 26, fontWeight: '900', color: '#191611',
    letterSpacing: -0.5, textAlign: 'center', marginBottom: 16,
  },
  divider: {
    width: 44, height: 3, borderRadius: 2,
    backgroundColor: '#B63B32', marginBottom: 20,
  },
  body: {
    fontSize: 14, color: '#4A4540', lineHeight: 22,
    textAlign: 'center', marginBottom: 10, maxWidth: 320,
  },
  email: { color: '#B99345', fontWeight: '700' },
  button: {
    marginTop: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#191611',
    paddingVertical: 16, paddingHorizontal: 48, borderRadius: 50,
    shadowColor: '#000', shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
  },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});

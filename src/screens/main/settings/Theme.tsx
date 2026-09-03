import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, type ThemeName } from '../../../constants/themes';
import { useAppTheme } from '../../../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function Theme({ navigation }: any) {
  const { themeId: activeThemeId, setAppTheme } = useAppTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>('light');
  const [isApplying, setIsApplying] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    setSelectedTheme(activeThemeId);
  }, [activeThemeId]);

  const currentPreview = THEMES[selectedTheme];

  const applyTheme = async () => {
    setIsApplying(true);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.5, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    try {
      await setAppTheme(selectedTheme);
      setTimeout(() => navigation.goBack(), 300);
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const getThemeDescription = (theme: ThemeName): string => {
    const descriptions: Record<ThemeName, string> = {
      light: 'Clean, bright, and modern',
      warm: 'Cozy golden-hour tones',
      sage: 'Nature-inspired tranquility',
      sepia: 'Vintage artifact warmth',
    };
    return descriptions[theme];
  };

  const getThemeFeatures = (theme: ThemeName): string[] => {
    const features: Record<ThemeName, string[]> = {
      light: ['High contrast', 'Crisp borders', 'Day optimized'],
      warm: ['Soft amber', 'Gentle shadows', 'Evening comfort'],
      sage: ['Earthy tones', 'Calming greens', 'Natural feel'],
      sepia: ['Retro warmth', 'Paper texture', 'Vintage charm'],
    };
    return features[theme];
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: currentPreview.bg }]} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: currentPreview.surface }]}>
            <TouchableOpacity 
              onPress={() => navigation?.goBack()} 
              style={[styles.backBtn, { 
                backgroundColor: currentPreview.raised,
                borderColor: currentPreview.border,
              }]} 
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={currentPreview.ink} />
            </TouchableOpacity>
            <Text style={[styles.pageTitle, { color: currentPreview.ink }]}>Appearance</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={[styles.titleDivider, { backgroundColor: currentPreview.gold }]} />

          {/* Current Theme Badge */}
          <View style={styles.currentBadgeContainer}>
            <View style={[styles.currentBadge, { backgroundColor: currentPreview.surface, borderColor: currentPreview.gold }]}>
              <Ionicons name="color-palette" size={16} color={currentPreview.gold} />
              <Text style={[styles.currentBadgeText, { color: currentPreview.gold }]}>
                Current: {currentPreview.name}
              </Text>
            </View>
          </View>

          {/* Live Preview Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: currentPreview.gold }]}>
              LIVE PREVIEW
            </Text>
            <View style={[styles.previewCard, { 
              backgroundColor: currentPreview.surface,
              borderColor: currentPreview.border,
              shadowColor: currentPreview.shadow,
            }]}>
              <View style={styles.previewDemo}>
                {/* Mock Card */}
                <View style={[styles.mockCard, { backgroundColor: currentPreview.bg, borderColor: currentPreview.border }]}>
                  <View style={[styles.mockHeader, { borderBottomColor: currentPreview.border }]}>
                    <View style={[styles.mockAvatar, { backgroundColor: currentPreview.gold }]} />
                    <View style={styles.mockTextGroup}>
                      <View style={[styles.mockTitle, { backgroundColor: currentPreview.ink }]} />
                      <View style={[styles.mockSubtitle, { backgroundColor: currentPreview.inkMid }]} />
                    </View>
                  </View>
                  <View style={[styles.mockBody, { backgroundColor: currentPreview.raised }]}>
                    <View style={[styles.mockLine, { backgroundColor: currentPreview.ink }]} />
                    <View style={[styles.mockLineShort, { backgroundColor: currentPreview.ink }]} />
                  </View>
                </View>

                {/* Mock Button */}
                <View style={[styles.mockButton, { backgroundColor: currentPreview.gold }]}>
                  <Text style={[styles.mockButtonText, { color: currentPreview.ink }]}>Action</Text>
                </View>
              </View>

              <View style={styles.previewColors}>
                {[
                  { label: 'Background', color: currentPreview.bg, icon: 'albums' },
                  { label: 'Surface', color: currentPreview.surface, icon: 'card' },
                  { label: 'Accent', color: currentPreview.gold, icon: 'sparkles' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.colorSwatch}>
                    <View style={[styles.colorSample, { backgroundColor: item.color, shadowColor: item.color }]} />
                    <Ionicons name={item.icon as any} size={12} color={currentPreview.inkDim} />
                    <Text style={[styles.colorLabel, { color: currentPreview.inkDim }]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Theme Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: currentPreview.gold }]}>
              CHOOSE STYLE
            </Text>
            <View style={[styles.themesCard, { 
              backgroundColor: currentPreview.surface,
              borderColor: currentPreview.border,
              shadowColor: currentPreview.shadow,
            }]}>
              {Object.entries(THEMES).map(([id, theme]) => {
                const isSelected = selectedTheme === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.themeRow,
                      isSelected && styles.themeRowSelected,
                      isSelected && { backgroundColor: `${currentPreview.gold}10` },
                      Platform.OS === 'ios' && styles.themeRowIOS,
                    ]}
                    onPress={() => setSelectedTheme(id as ThemeName)}
                    activeOpacity={0.65}
                  >
                    <View style={styles.themePreview}>
                      <View style={[
                        styles.themeIconBg,
                        { 
                          backgroundColor: isSelected 
                            ? `${currentPreview.gold}20`
                            : currentPreview.overlay,
                          borderWidth: isSelected ? 1.5 : 0,
                          borderColor: currentPreview.gold,
                        }
                      ]}>
                        <Ionicons 
                          name={theme.icon as any} 
                          size={22} 
                          color={isSelected ? currentPreview.gold : currentPreview.inkMid} 
                        />
                      </View>
                      <View style={styles.themeInfo}>
                        <View style={styles.themeNameRow}>
                          <Text style={[styles.themeName, { color: currentPreview.ink }]}>
                            {theme.name}
                          </Text>
                          {isSelected && (
                            <View style={[styles.selectedPill, { backgroundColor: currentPreview.gold }]}>
                              <Text style={[styles.selectedPillText, { color: currentPreview.ink }]}>Selected</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.themeDesc, { color: currentPreview.inkDim }]}>
                          {getThemeDescription(id as ThemeName)}
                        </Text>
                        <View style={styles.featureTags}>
                          {getThemeFeatures(id as ThemeName).slice(0, 2).map((feature, idx) => (
                            <View key={idx} style={[styles.featureTag, { backgroundColor: currentPreview.overlay }]}>
                              <Text style={[styles.featureTagText, { color: currentPreview.ink }]}>
                                {feature}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                    
                    <View style={[
                      styles.radioOuter,
                      isSelected && { borderColor: currentPreview.gold },
                      !isSelected && { borderColor: currentPreview.border },
                    ]}>
                      {isSelected && (
                        <View style={[styles.radioInner, { backgroundColor: currentPreview.gold }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Spacing for bottom bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* Apply Button - Floating */}
      <View style={[styles.bottomBar, { 
        backgroundColor: currentPreview.surface,
        borderTopColor: currentPreview.border,
      }]}>
        <TouchableOpacity
          style={[
            styles.applyBtn,
            { 
              backgroundColor: currentPreview.gold,
              shadowColor: currentPreview.gold,
            },
            isApplying && styles.applyBtnDisabled
          ]}
          onPress={applyTheme}
          disabled={isApplying}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={20} color={currentPreview.ink} style={styles.applyIcon} />
          <Text style={[styles.applyBtnText, { color: currentPreview.ink }]}>
            {isApplying ? 'Applying...' : `Apply ${currentPreview.name} Theme`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  pageTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    letterSpacing: -0.5,
  },
  titleDivider: { 
    height: 3,
    width: 60,
    marginHorizontal: 20,
    borderRadius: 3,
    marginTop: -1,
    marginBottom: 16,
  },

  // Current badge
  currentBadgeContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
  },
  currentBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Sections
  section: { 
    paddingHorizontal: 20, 
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: { 
    fontSize: 11, 
    fontWeight: '800', 
    letterSpacing: 2,
    marginBottom: 14,
    marginLeft: 4,
  },

  // Preview Card
  previewCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  previewDemo: {
    marginBottom: 20,
    gap: 12,
  },
  mockCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
  },
  mockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  mockAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  mockTextGroup: {
    flex: 1,
    gap: 6,
  },
  mockTitle: {
    width: 120,
    height: 12,
    borderRadius: 6,
  },
  mockSubtitle: {
    width: 80,
    height: 10,
    borderRadius: 5,
  },
  mockBody: {
    marginTop: 10,
    padding: 8,
    borderRadius: 12,
    gap: 6,
  },
  mockLine: {
    height: 8,
    borderRadius: 4,
    width: '100%',
  },
  mockLineShort: {
    height: 8,
    borderRadius: 4,
    width: '60%',
  },
  mockButton: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mockButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewColors: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  colorSwatch: {
    alignItems: 'center',
    gap: 6,
  },
  colorSample: { 
    width: 44,
    height: 44,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorLabel: { 
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Themes Card
  themesCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  themeRowSelected: {
    borderRadius: 0,
  },
  themeRowIOS: {},
  themePreview: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
    gap: 14,
  },
  themeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeInfo: { 
    flex: 1,
    gap: 4,
  },
  themeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeName: { 
    fontSize: 16, 
    fontWeight: '700', 
  },
  selectedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  selectedPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  themeDesc: { 
    fontSize: 12,
    fontWeight: '400',
  },
  featureTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  featureTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featureTagText: {
    fontSize: 9,
    fontWeight: '500',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  applyIcon: {
    marginRight: 4,
  },
  applyBtnDisabled: {
    opacity: 0.7,
  },
  applyBtnText: { 
    fontSize: 16, 
    fontWeight: '700', 
    letterSpacing: 0.3,
  },
});
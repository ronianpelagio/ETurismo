import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { THEMES, type ThemeName } from '../../../constants/themes';
import { useAppTheme } from '../../../context/ThemeContext';

export default function Theme({ navigation }: any) {
  const { themeId: activeThemeId, setAppTheme } = useAppTheme();

  const [selectedTheme, setSelectedTheme] =
    useState<ThemeName>(activeThemeId);

  const [isApplying, setIsApplying] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setSelectedTheme(activeThemeId);
  }, [activeThemeId]);

  const preview = THEMES[selectedTheme];

  const descriptions: Record<ThemeName, string> = {
    light: 'Clean and bright',
    warm: 'Soft and comfortable',
    sage: 'Calm and natural',
    sepia: 'Classic and warm',
  };

  const handleSelectTheme = (theme: ThemeName) => {
    if (theme === selectedTheme) return;

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.75,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedTheme(theme);
  };

  const applyTheme = async () => {
    if (isApplying) return;

    try {
      setIsApplying(true);

      await setAppTheme(selectedTheme);

      setTimeout(() => {
        navigation?.goBack();
      }, 200);
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const hasChanges = selectedTheme !== activeThemeId;

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: preview.bg,
        },
      ]}
      edges={['top', 'bottom']}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: preview.bg,
            borderBottomColor: preview.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: preview.surface,
              borderColor: preview.border,
            },
          ]}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={preview.ink}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text
            style={[
              styles.title,
              {
                color: preview.ink,
              },
            ]}
          >
            Appearance
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: preview.inkDim,
              },
            ]}
          >
            Choose how ETurismo looks
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Simple Preview */}
          <Text
            style={[
              styles.sectionTitle,
              {
                color: preview.inkDim,
              },
            ]}
          >
            PREVIEW
          </Text>

          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: preview.surface,
                borderColor: preview.border,
              },
            ]}
          >
            <View style={styles.previewTop}>
              <View
                style={[
                  styles.previewIcon,
                  {
                    backgroundColor: preview.goldSoft,
                  },
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={22}
                  color={preview.gold}
                />
              </View>

              <View style={styles.previewText}>
                <Text
                  style={[
                    styles.previewTitle,
                    {
                      color: preview.ink,
                    },
                  ]}
                >
                  Sacred Heritage
                </Text>

                <Text
                  style={[
                    styles.previewSubtitle,
                    {
                      color: preview.inkDim,
                    },
                  ]}
                >
                  Explore history and culture
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.previewDivider,
                {
                  backgroundColor: preview.border,
                },
              ]}
            />

            <View style={styles.previewBottom}>
              <View style={styles.previewColors}>
                <View
                  style={[
                    styles.colorCircle,
                    {
                      backgroundColor: preview.bg,
                      borderColor: preview.border,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.colorCircle,
                    {
                      backgroundColor: preview.surface,
                      borderColor: preview.border,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.colorCircle,
                    {
                      backgroundColor: preview.gold,
                      borderColor: preview.gold,
                    },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.smallButton,
                  {
                    backgroundColor: preview.gold,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.smallButtonText,
                    {
                      color: preview.ink,
                    },
                  ]}
                >
                  Explore
                </Text>
              </View>
            </View>
          </View>

          {/* Theme Options */}
          <Text
            style={[
              styles.sectionTitle,
              {
                color: preview.inkDim,
              },
            ]}
          >
            THEME
          </Text>

          <View
            style={[
              styles.themeList,
              {
                backgroundColor: preview.surface,
                borderColor: preview.border,
              },
            ]}
          >
            {Object.entries(THEMES).map(
              ([id, theme], index, array) => {
                const themeId = id as ThemeName;
                const selected = selectedTheme === themeId;

                return (
                  <TouchableOpacity
                    key={themeId}
                    style={[
                      styles.themeItem,
                      index !== array.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: preview.border,
                      },
                    ]}
                    onPress={() =>
                      handleSelectTheme(themeId)
                    }
                    activeOpacity={0.7}
                  >
                    {/* Theme Icon */}
                    <View
                      style={[
                        styles.themeIcon,
                        {
                          backgroundColor: selected
                            ? preview.goldSoft
                            : preview.raised,
                        },
                      ]}
                    >
                      <Ionicons
                        name={theme.icon as any}
                        size={21}
                        color={
                          selected
                            ? preview.gold
                            : preview.inkMid
                        }
                      />
                    </View>

                    {/* Theme Name */}
                    <View style={styles.themeDetails}>
                      <Text
                        style={[
                          styles.themeName,
                          {
                            color: preview.ink,
                          },
                        ]}
                      >
                        {theme.name}
                      </Text>

                      <Text
                        style={[
                          styles.themeDescription,
                          {
                            color: preview.inkDim,
                          },
                        ]}
                      >
                        {descriptions[themeId]}
                      </Text>
                    </View>

                    {/* Selection */}
                    {selected ? (
                      <View
                        style={[
                          styles.selectedCircle,
                          {
                            backgroundColor: preview.gold,
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color={preview.ink}
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.emptyCircle,
                          {
                            borderColor: preview.border,
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {/* Selected Theme */}
          <View
            style={[
              styles.selectedInfo,
              {
                backgroundColor: preview.goldSoft,
                borderColor: preview.borderGold,
              },
            ]}
          >
            <Ionicons
              name="color-palette-outline"
              size={18}
              color={preview.gold}
            />

            <Text
              style={[
                styles.selectedInfoText,
                {
                  color: preview.inkMid,
                },
              ]}
            >
              Selected
            </Text>

            <Text
              style={[
                styles.selectedInfoTheme,
                {
                  color: preview.ink,
                },
              ]}
            >
              {preview.name}
            </Text>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </Animated.View>

      {/* Bottom Apply */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: preview.bg,
            borderTopColor: preview.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.applyButton,
            {
              backgroundColor: hasChanges
                ? preview.gold
                : preview.raised,
              borderColor: hasChanges
                ? preview.gold
                : preview.border,
            },
          ]}
          onPress={applyTheme}
          disabled={isApplying || !hasChanges}
          activeOpacity={0.8}
        >
          {isApplying ? (
            <Text
              style={[
                styles.applyText,
                {
                  color: preview.ink,
                },
              ]}
            >
              Applying...
            </Text>
          ) : (
            <>
              <Ionicons
                name={
                  hasChanges
                    ? 'checkmark-circle-outline'
                    : 'checkmark-circle'
                }
                size={20}
                color={
                  hasChanges
                    ? preview.ink
                    : preview.inkDim
                }
              />

              <Text
                style={[
                  styles.applyText,
                  {
                    color: hasChanges
                      ? preview.ink
                      : preview.inkDim,
                  },
                ]}
              >
                {hasChanges
                  ? `Apply ${preview.name}`
                  : 'Theme Applied'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  headerText: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },

  headerSpacer: {
    width: 40,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 10,
    marginLeft: 2,
  },

  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
  },

  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewText: {
    flex: 1,
    marginLeft: 12,
  },

  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
  },

  previewSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  previewDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 15,
  },

  previewBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  previewColors: {
    flexDirection: 'row',
    gap: 7,
  },

  colorCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
  },

  smallButton: {
    paddingHorizontal: 17,
    paddingVertical: 8,
    borderRadius: 10,
  },

  smallButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },

  themeList: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },

  themeItem: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 13,
  },

  themeIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  themeDetails: {
    flex: 1,
    marginLeft: 13,
  },

  themeName: {
    fontSize: 15,
    fontWeight: '700',
  },

  themeDescription: {
    fontSize: 11,
    marginTop: 3,
  },

  selectedCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1.5,
  },

  selectedInfo: {
    marginTop: 14,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedInfoText: {
    fontSize: 12,
    marginLeft: 8,
  },

  selectedInfoTheme: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  applyButton: {
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  applyText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
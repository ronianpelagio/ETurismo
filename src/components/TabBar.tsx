import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TabItem {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
  variant?: 'default' | 'pills' | 'underline' | 'buttons';
  size?: 'small' | 'medium' | 'large';
  scrollable?: boolean;
  style?: ViewStyle;
  tabStyle?: ViewStyle;
  activeTabStyle?: ViewStyle;
  labelStyle?: TextStyle;
  activeLabelStyle?: TextStyle;
}

const C = {
  bg: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#1A1612',
  inkMid: '#6B6459',
  inkLight: '#A89F96',
  gold: '#C9A84C',
  goldSoft: '#F5EDD8',
  border: '#EAE4DA',
  danger: '#C0392B',
};

export default function TabBar({
  tabs,
  activeTab,
  onTabPress,
  variant = 'default',
  size = 'medium',
  scrollable = false,
  style,
  tabStyle,
  activeTabStyle,
  labelStyle,
  activeLabelStyle,
}: TabBarProps) {
  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      backgroundColor: C.surface,
      borderRadius: 8,
      ...getSizeStyle(),
    };

    switch (variant) {
      case 'pills':
        return {
          ...baseStyle,
          backgroundColor: C.bg,
          padding: 4,
          borderRadius: 12,
        };
      case 'underline':
        return {
          ...baseStyle,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        };
      case 'buttons':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          paddingHorizontal: 0,
        };
      default:
        return {
          ...baseStyle,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { minHeight: 40 };
      case 'large':
        return { minHeight: 56 };
      default:
        return { minHeight: 48 };
    }
  };

  const getTabStyle = (isActive: boolean): ViewStyle => {
    const baseStyle: ViewStyle = {
      flex: scrollable ? undefined : 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: scrollable ? 4 : 0,
      borderRadius: 8,
      position: 'relative',
    };

    switch (variant) {
      case 'pills':
        return {
          ...baseStyle,
          backgroundColor: isActive ? C.surface : 'transparent',
          shadowColor: isActive ? C.ink : 'transparent',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isActive ? 0.1 : 0,
          shadowRadius: 2,
          elevation: isActive ? 2 : 0,
        };
      case 'underline':
        return {
          ...baseStyle,
          borderBottomWidth: isActive ? 2 : 0,
          borderBottomColor: isActive ? C.gold : 'transparent',
          marginBottom: -1,
        };
      case 'buttons':
        return {
          ...baseStyle,
          backgroundColor: isActive ? C.gold : 'transparent',
          borderWidth: 1,
          borderColor: isActive ? C.gold : C.border,
          marginHorizontal: 4,
        };
      default:
        return baseStyle;
    }
  };

  const getLabelStyle = (isActive: boolean): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: isActive ? '600' : '500',
      textAlign: 'center',
      ...getSizeTextStyle(),
    };

    switch (variant) {
      case 'buttons':
        return {
          ...baseStyle,
          color: isActive ? C.surface : C.ink,
        };
      default:
        return {
          ...baseStyle,
          color: isActive ? C.gold : C.inkMid,
        };
    }
  };

  const getSizeTextStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return { fontSize: 12 };
      case 'large':
        return { fontSize: 16 };
      default:
        return { fontSize: 14 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 20;
      default:
        return 18;
    }
  };

  const renderTab = (tab: TabItem) => {
    const isActive = activeTab === tab.key;

    return (
      <TouchableOpacity
        key={tab.key}
        onPress={() => onTabPress(tab.key)}
        style={[
          getTabStyle(isActive),
          tabStyle,
          isActive && activeTabStyle,
        ]}
      >
        {tab.icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={tab.icon}
              size={getIconSize()}
              color={getLabelStyle(isActive).color}
            />
            {tab.badge && tab.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {tab.badge > 99 ? '99+' : tab.badge}
                </Text>
              </View>
            )}
          </View>
        )}

        <Text
          style={[
            getLabelStyle(isActive),
            labelStyle,
            isActive && activeLabelStyle,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[getContainerStyle(), style]}
      >
        {tabs.map(renderTab)}
      </ScrollView>
    );
  }

  return (
    <View style={[getContainerStyle(), style]}>
      {tabs.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: C.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: C.surface,
    fontSize: 10,
    fontWeight: '600',
  },
});
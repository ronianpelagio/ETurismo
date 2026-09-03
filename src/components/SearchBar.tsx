import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps extends TextInputProps {
  onSearch?: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  variant?: 'default' | 'outlined' | 'filled';
  showClearButton?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
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

const SearchBar = forwardRef<TextInput, SearchBarProps>(({
  value,
  onChangeText,
  onSearch,
  onClear,
  placeholder = 'Search...',
  variant = 'default',
  showClearButton = true,
  style,
  inputStyle,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 16,
      minHeight: 48,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: isFocused ? C.gold : C.border,
          backgroundColor: C.surface,
        };
      case 'filled':
        return {
          ...baseStyle,
          borderWidth: 0,
          backgroundColor: C.bg,
          borderBottomWidth: 1,
          borderBottomColor: isFocused ? C.gold : C.border,
          borderRadius: 0,
          paddingHorizontal: 0,
        };
      default:
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: isFocused ? C.gold : C.border,
          backgroundColor: C.surface,
        };
    }
  };

  const getInputStyle = (): TextStyle => {
    return {
      flex: 1,
      fontSize: 16,
      color: C.ink,
      paddingVertical: 12,
      marginLeft: 12,
    };
  };

  const handleTextChange = (text: string) => {
    onChangeText?.(text);
  };

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  const handleSubmit = () => {
    if (value && onSearch) {
      onSearch(value);
    }
  };

  return (
    <View style={[getContainerStyle(), style]}>
      <Ionicons
        name="search"
        size={20}
        color={isFocused ? C.gold : C.inkLight}
      />

      <TextInput
        ref={ref}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={C.inkLight}
        style={[getInputStyle(), inputStyle]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
        {...props}
      />

      {showClearButton && value && value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color={C.inkLight} />
        </TouchableOpacity>
      )}
    </View>
  );
});

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default SearchBar;
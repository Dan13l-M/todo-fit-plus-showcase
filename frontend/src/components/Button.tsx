import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: {
      backgroundColor: '#4F46E5',
      textColor: '#FFFFFF',
      borderColor: undefined,
      borderWidth: undefined,
    },
    secondary: {
      backgroundColor: '#6B7280',
      textColor: '#FFFFFF',
      borderColor: undefined,
      borderWidth: undefined,
    },
    danger: {
      backgroundColor: '#EF4444',
      textColor: '#FFFFFF',
      borderColor: undefined,
      borderWidth: undefined,
    },
    outline: {
      backgroundColor: 'transparent',
      textColor: '#4F46E5',
      borderColor: '#4F46E5',
      borderWidth: 2,
    },
  };

  const sizeStyles = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: 14,
      iconSize: 16,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      fontSize: 16,
      iconSize: 20,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      fontSize: 18,
      iconSize: 24,
    },
  };

  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: currentVariant.backgroundColor,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          opacity: isDisabled ? 0.5 : 1,
          width: fullWidth ? '100%' : 'auto',
        },
        variant === 'outline' && {
          borderColor: currentVariant.borderColor,
          borderWidth: currentVariant.borderWidth,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={currentVariant.textColor} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={currentSize.iconSize}
              color={currentVariant.textColor}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: currentVariant.textColor,
                fontSize: currentSize.fontSize,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8,
  },
  text: {
    fontWeight: '600',
  },
  icon: {
    marginRight: 4,
  },
});

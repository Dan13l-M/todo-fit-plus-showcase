// Color palette for the app
export const Colors = {
  // Primary colors
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#6366F1',
  
  // Background colors
  background: '#111827',
  backgroundLight: '#1F2937',
  backgroundDark: '#0F172A',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  
  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Border colors
  border: '#374151',
  borderLight: '#4B5563',
  
  // Routine type colors
  routineTypes: {
    PUSH: '#EF4444',
    PULL: '#3B82F6',
    LEGS: '#22C55E',
    UPPER_BODY: '#F97316',
    LOWER_BODY: '#8B5CF6',
    FREE: '#6B7280',
  },
  
  // Difficulty colors
  difficulty: {
    BEGINNER: '#22C55E',
    INTERMEDIATE: '#F59E0B',
    ADVANCED: '#EF4444',
  },
} as const;

// Spacing constants
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Font sizes
export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Border radius
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
} as const;

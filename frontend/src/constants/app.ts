import { Ionicons } from '@expo/vector-icons';

// Routine types
export const ROUTINE_TYPES = {
  PUSH: { 
    label: 'Push', 
    color: '#EF4444', 
    icon: 'arrow-forward' as keyof typeof Ionicons.glyphMap 
  },
  PULL: { 
    label: 'Pull', 
    color: '#3B82F6', 
    icon: 'arrow-back' as keyof typeof Ionicons.glyphMap 
  },
  LEGS: { 
    label: 'Piernas', 
    color: '#22C55E', 
    icon: 'footsteps' as keyof typeof Ionicons.glyphMap 
  },
  UPPER_BODY: { 
    label: 'Tren Superior', 
    color: '#F97316', 
    icon: 'body' as keyof typeof Ionicons.glyphMap 
  },
  LOWER_BODY: { 
    label: 'Tren Inferior', 
    color: '#8B5CF6', 
    icon: 'fitness' as keyof typeof Ionicons.glyphMap 
  },
  FREE: { 
    label: 'Libre', 
    color: '#6B7280', 
    icon: 'shuffle' as keyof typeof Ionicons.glyphMap 
  },
} as const;

// Difficulty levels
export const DIFFICULTY_LEVELS = {
  BEGINNER: { label: 'Principiante', color: '#22C55E' },
  INTERMEDIATE: { label: 'Intermedio', color: '#F59E0B' },
  ADVANCED: { label: 'Avanzado', color: '#EF4444' },
} as const;

// Account levels and XP thresholds
export const ACCOUNT_LEVELS = [
  { level: 'Novice', minXP: 0, color: '#9CA3AF' },
  { level: 'Beginner', minXP: 100, color: '#22C55E' },
  { level: 'Intermediate', minXP: 500, color: '#3B82F6' },
  { level: 'Advanced', minXP: 1500, color: '#8B5CF6' },
  { level: 'Expert', minXP: 3000, color: '#F59E0B' },
  { level: 'Master', minXP: 5000, color: '#EF4444' },
  { level: 'Legend', minXP: 10000, color: '#EC4899' },
] as const;

// PR (Personal Record) types
export const PR_TYPES = {
  MAX_WEIGHT: 'Peso Máximo',
  MAX_REPS: 'Repeticiones Máximas',
  MAX_VOLUME: 'Volumen Máximo',
} as const;

// Achievement categories
export const ACHIEVEMENT_CATEGORIES = {
  WORKOUT: 'Entrenamientos',
  VOLUME: 'Volumen',
  PR: 'Récords',
  STREAK: 'Racha',
  LEVEL: 'Nivel',
} as const;

// Achievement rarities
export const ACHIEVEMENT_RARITIES = {
  COMMON: { label: 'Común', color: '#9CA3AF' },
  RARE: { label: 'Raro', color: '#3B82F6' },
  EPIC: { label: 'Épico', color: '#8B5CF6' },
  LEGENDARY: { label: 'Legendario', color: '#F59E0B' },
} as const;

// Rest timer presets (in seconds)
export const REST_TIMER_PRESETS = [30, 60, 90, 120, 180, 240, 300] as const;

// RPE (Rate of Perceived Exertion) scale
export const RPE_SCALE = [
  { value: 1, label: 'Muy Fácil', color: '#22C55E' },
  { value: 2, label: 'Fácil', color: '#84CC16' },
  { value: 3, label: 'Moderado', color: '#F59E0B' },
  { value: 4, label: 'Difícil', color: '#F97316' },
  { value: 5, label: 'Muy Difícil', color: '#EF4444' },
] as const;

// API timeout
export const API_TIMEOUT = 10000; // 10 seconds

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

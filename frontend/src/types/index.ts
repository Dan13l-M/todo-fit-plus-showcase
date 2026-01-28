// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  account_level: string;
  total_volume_kg: number;
  current_streak_days: number;
  longest_streak_days: number;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Exercise Types
export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  exercise_type: string;
  pattern: string;
  equipment: string;
  subtype?: string;
  notes?: string;
}

// Routine Types
export interface RoutineExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_order: number;
  sets_planned: number;
  reps_planned?: number;
  reps_min?: number;
  reps_max?: number;
  target_weight_kg?: number;
  rest_seconds: number;
  notes?: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  routine_type: string;
  difficulty_level: string;
  times_completed: number;
  exercises: RoutineExercise[];
  created_at: string;
  updated_at: string;
}

// Workout Session Types
export interface ExerciseSet {
  id: string;
  set_number: number;
  reps_completed: number;
  weight_kg: number;
  rpe?: number;
  is_warmup: boolean;
  is_failure: boolean;
  is_pr: boolean;
  completed_at: string;
  notes?: string;
}

export interface SessionExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_order: number;
  sets: ExerciseSet[];
  completed_at?: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id?: string;
  routine_name?: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  total_volume_kg: number;
  total_sets: number;
  total_reps: number;
  is_completed: boolean;
  notes?: string;
  exercises: SessionExercise[];
}

// Progress Types
export interface PersonalRecord {
  id: string;
  exercise_id: string;
  exercise_name: string;
  pr_type: string;
  value: number;
  reps?: number;
  achieved_at: string;
}

export interface DashboardStats {
  current_streak_days: number;
  longest_streak_days: number;
  total_volume_kg: number;
  workouts_this_month: number;
  prs_this_month: number;
  account_level: string;
  recent_sessions: WorkoutSession[];
}

// Routine Types
export type RoutineType = 'PUSH' | 'PULL' | 'LEGS' | 'UPPER_BODY' | 'LOWER_BODY' | 'FREE';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

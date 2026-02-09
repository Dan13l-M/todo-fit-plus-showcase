import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AuthResponse, User, Exercise, Routine, WorkoutSession, DashboardStats, PersonalRecord } from '../types';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://todofit.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (data: { email: string; username: string; password: string; full_name?: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  
  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  resetPassword: async (email: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', null, {
      params: { email, new_password: newPassword }
    });
    return response.data;
  },
};

// Exercises API
export const exercisesApi = {
  getAll: async (params?: { muscle?: string; equipment?: string; search?: string; limit?: number; skip?: number }): Promise<Exercise[]> => {
    const response = await api.get('/exercises', { params });
    return response.data;
  },
  
  getMuscleGroups: async (): Promise<string[]> => {
    const response = await api.get('/exercises/muscles');
    return response.data;
  },
  
  getEquipmentTypes: async (): Promise<string[]> => {
    const response = await api.get('/exercises/equipment');
    return response.data;
  },
  
  getById: async (id: string): Promise<Exercise> => {
    const response = await api.get(`/exercises/${id}`);
    return response.data;
  },
};

// Routines API
export const routinesApi = {
  getAll: async (): Promise<Routine[]> => {
    const response = await api.get('/routines');
    return response.data;
  },
  
  get: async (id: string): Promise<Routine> => {
    const response = await api.get(`/routines/${id}`);
    return response.data;
  },
  
  getById: async (id: string): Promise<Routine> => {
    const response = await api.get(`/routines/${id}`);
    return response.data;
  },
  
  create: async (data: {
    name: string;
    description?: string;
    routine_type: string;
    difficulty_level?: string;
    exercises?: {
      exercise_id: string;
      exercise_order: number;
      sets_planned?: number;
      reps_planned?: number;
      target_weight_kg?: number;
      rest_seconds?: number;
    }[];
  }): Promise<Routine> => {
    const response = await api.post('/routines', data);
    return response.data;
  },
  
  update: async (id: string, data: {
    name?: string;
    description?: string;
    routine_type?: string;
    difficulty_level?: string;
    exercises?: {
      exercise_id: string;
      exercise_order: number;
      sets_planned?: number;
      reps_planned?: number;
      target_weight_kg?: number;
      rest_seconds?: number;
    }[];
  }): Promise<Routine> => {
    const response = await api.put(`/routines/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/routines/${id}`);
  },
  
  addExercise: async (routineId: string, data: {
    exercise_id: string;
    exercise_order: number;
    sets_planned?: number;
    reps_planned?: number;
    target_weight_kg?: number;
    rest_seconds?: number;
  }): Promise<any> => {
    const response = await api.post(`/routines/${routineId}/exercises`, data);
    return response.data;
  },
  
  removeExercise: async (routineId: string, exerciseId: string): Promise<void> => {
    await api.delete(`/routines/${routineId}/exercises/${exerciseId}`);
  },
};

// Sessions API
export const sessionsApi = {
  start: async (data: { routine_id?: string; notes?: string }): Promise<WorkoutSession> => {
    const response = await api.post('/sessions', data);
    return response.data;
  },
  
  getById: async (id: string): Promise<WorkoutSession> => {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
  },
  
  getAll: async (params?: { limit?: number; skip?: number }): Promise<WorkoutSession[]> => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },
  
  getActive: async (): Promise<WorkoutSession | null> => {
    try {
      const response = await api.get('/sessions/active/current');
      return response.data;
    } catch (err) {
      console.error('Error fetching active session:', err);
      return null;
    }
  },
  
  addSet: async (sessionId: string, data: {
    exercise_id: string;
    set_data: {
      set_number: number;
      reps_completed: number;
      weight_kg: number;
      rpe?: number;
      is_warmup?: boolean;
      is_failure?: boolean;
      notes?: string;
    };
  }): Promise<any> => {
    const response = await api.post(`/sessions/${sessionId}/sets`, data);
    return response.data;
  },
  
  updateSet: async (sessionId: string, setId: string, setData: {
    set_number: number;
    reps_completed: number;
    weight_kg: number;
    rpe?: number;
    is_warmup?: boolean;
    is_failure?: boolean;
    notes?: string;
  }): Promise<any> => {
    const response = await api.put(`/sessions/${sessionId}/sets/${setId}`, setData);
    return response.data;
  },
  
  deleteSet: async (sessionId: string, setId: string): Promise<void> => {
    await api.delete(`/sessions/${sessionId}/sets/${setId}`);
  },
  
  addExercise: async (sessionId: string, exerciseId: string, exerciseOrder: number): Promise<any> => {
    const response = await api.post(`/sessions/${sessionId}/exercises`, {
      exercise_id: exerciseId,
      exercise_order: exerciseOrder,
    });
    return response.data;
  },
  
  complete: async (sessionId: string): Promise<WorkoutSession> => {
    const response = await api.post(`/sessions/${sessionId}/complete`);
    return response.data;
  },
  
  delete: async (sessionId: string): Promise<void> => {
    await api.delete(`/sessions/${sessionId}`);
  },
};

// Progress API
export const progressApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/progress/dashboard');
    return response.data;
  },
  
  getPersonalRecords: async (): Promise<PersonalRecord[]> => {
    const response = await api.get('/progress/prs');
    return response.data;
  },
  
  getExerciseHistory: async (exerciseId: string, limit?: number): Promise<any[]> => {
    const response = await api.get(`/progress/exercise/${exerciseId}/history`, { params: { limit } });
    return response.data;
  },
};

// Admin API (for seeding)
export const adminApi = {
  seedExercises: async (): Promise<{ message: string }> => {
    const response = await api.post('/admin/seed-exercises');
    return response.data;
  },
  seedAchievements: async (): Promise<{ message: string }> => {
    const response = await api.post('/admin/seed-achievements');
    return response.data;
  },
};

// Achievements API
export const achievementsApi = {
  getAll: async (): Promise<any[]> => {
    const response = await api.get('/achievements');
    return response.data;
  },
  
  getUserAchievements: async (): Promise<any[]> => {
    const response = await api.get('/achievements/user');
    return response.data;
  },
  
  checkAndUnlock: async (): Promise<{ newly_unlocked: any[]; total_unlocked: number }> => {
    const response = await api.post('/achievements/check');
    return response.data;
  },
};

// Tasks API
export const tasksApi = {
  getTasks: async (filters?: any): Promise<any[]> => {
    const response = await api.get('/tasks', { params: filters });
    return response.data;
  },
  
  getTask: async (id: string): Promise<any> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },
  
  createTask: async (data: any): Promise<any> => {
    const response = await api.post('/tasks', data);
    return response.data;
  },
  
  updateTask: async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },
  
  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
  
  toggleTask: async (id: string): Promise<any> => {
    const response = await api.patch(`/tasks/${id}/toggle`);
    return response.data;
  },
  
  // Subtasks
  addSubtask: async (taskId: string, title: string): Promise<any> => {
    const response = await api.post(`/tasks/${taskId}/subtasks`, { title });
    return response.data;
  },
  
  toggleSubtask: async (taskId: string, subtaskId: string): Promise<any> => {
    const response = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
    return response.data;
  },
  
  deleteSubtask: async (taskId: string, subtaskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
  },
  
  // Stats & Fitness
  getStats: async (): Promise<any> => {
    const response = await api.get('/tasks/stats');
    return response.data;
  },
  
  getFitnessSuggestions: async (): Promise<any> => {
    const response = await api.get('/tasks/fitness-suggestions');
    return response.data;
  },
  
  checkFitnessProgress: async (): Promise<any> => {
    const response = await api.post('/tasks/check-fitness-progress');
    return response.data;
  },
};

export default api;

import { create } from 'zustand';
import { WorkoutSession, Exercise, ExerciseSet } from '../types';
import { sessionsApi } from '../services/api';

interface WorkoutState {
  activeSession: WorkoutSession | null;
  currentExercise: Exercise | null;
  restTimer: number;
  isResting: boolean;
  
  // Actions
  startSession: (routineId?: string) => Promise<void>;
  loadActiveSession: () => Promise<void>;
  addSet: (exerciseId: string, setData: {
    set_number: number;
    reps_completed: number;
    weight_kg: number;
    rpe?: number;
    is_warmup?: boolean;
    is_failure?: boolean;
  }) => Promise<ExerciseSet>;
  completeSession: () => Promise<void>;
  setCurrentExercise: (exercise: Exercise | null) => void;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  clearSession: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeSession: null,
  currentExercise: null,
  restTimer: 0,
  isResting: false,
  
  startSession: async (routineId?: string) => {
    try {
      const session = await sessionsApi.start({ routine_id: routineId });
      set({ activeSession: session });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
    }
  },
  
  loadActiveSession: async () => {
    try {
      const session = await sessionsApi.getActive();
      if (session) {
        set({ activeSession: session });
      }
    } catch (error) {
      console.log('No active session');
    }
  },
  
  addSet: async (exerciseId: string, setData) => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No hay sesión activa');
    
    try {
      const result = await sessionsApi.addSet(activeSession.id, {
        exercise_id: exerciseId,
        set_data: setData,
      });
      
      // Reload session to get updated data
      const updatedSession = await sessionsApi.getById(activeSession.id);
      set({ activeSession: updatedSession });
      
      return result;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al agregar serie');
    }
  },
  
  completeSession: async () => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No hay sesión activa');
    
    try {
      const completedSession = await sessionsApi.complete(activeSession.id);
      set({ activeSession: null, currentExercise: null });
      return completedSession;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al completar sesión');
    }
  },
  
  setCurrentExercise: (exercise) => {
    set({ currentExercise: exercise });
  },
  
  startRestTimer: (seconds) => {
    set({ restTimer: seconds, isResting: true });
  },
  
  stopRestTimer: () => {
    set({ restTimer: 0, isResting: false });
  },
  
  clearSession: () => {
    set({ activeSession: null, currentExercise: null, restTimer: 0, isResting: false });
  },
}));

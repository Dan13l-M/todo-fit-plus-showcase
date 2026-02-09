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
  updateSet: (setId: string, setData: {
    set_number: number;
    reps_completed: number;
    weight_kg: number;
    rpe?: number;
    is_warmup?: boolean;
    is_failure?: boolean;
  }) => Promise<ExerciseSet>;
  deleteSet: (setId: string) => Promise<void>;
  addExerciseToSession: (exerciseId: string) => Promise<void>;
  completeSession: () => Promise<void>;
  deleteSession: () => Promise<void>;
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
    } catch (err) {
      console.log('No active session:', err);
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
      
      // Reload session from active endpoint to get all exercises with planning data
      const updatedSession = await sessionsApi.getActive();
      if (updatedSession) {
        set({ activeSession: updatedSession });
      }
      
      return result;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al agregar serie');
    }
  },
  
  updateSet: async (setId: string, setData) => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No hay sesión activa');
    
    try {
      const result = await sessionsApi.updateSet(activeSession.id, setId, setData);
      
      // Reload session from active endpoint to get updated data
      const updatedSession = await sessionsApi.getActive();
      if (updatedSession) {
        set({ activeSession: updatedSession });
      }
      
      return result;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al actualizar serie');
    }
  },
  
  deleteSet: async (setId: string) => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No hay sesión activa');
    
    try {
      await sessionsApi.deleteSet(activeSession.id, setId);
      
      // Reload session from active endpoint to get updated data
      const updatedSession = await sessionsApi.getActive();
      if (updatedSession) {
        set({ activeSession: updatedSession });
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al eliminar serie');
    }
  },
  
  addExerciseToSession: async (exerciseId: string) => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No hay sesión activa');
    
    try {
      // Calculate next exercise order
      const nextOrder = (activeSession.exercises?.length || 0) + 1;
      
      await sessionsApi.addExercise(activeSession.id, exerciseId, nextOrder);
      
      // Reload session from active endpoint to get updated data
      const updatedSession = await sessionsApi.getActive();
      if (updatedSession) {
        set({ activeSession: updatedSession });
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al agregar ejercicio');
    }
  },
  
  completeSession: async () => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No hay sesión activa');
    
    try {
      await sessionsApi.complete(activeSession.id);
      set({ activeSession: null, currentExercise: null, restTimer: 0, isResting: false });
    } catch (error: any) {
      // Si el error es que la sesión no existe, limpiar de todos modos
      if (error.response?.status === 404) {
        set({ activeSession: null, currentExercise: null, restTimer: 0, isResting: false });
        return;
      }
      throw new Error(error.response?.data?.detail || 'Error al completar sesión');
    }
  },
  
  deleteSession: async () => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No hay sesión activa');
    
    try {
      await sessionsApi.delete(activeSession.id);
      set({ activeSession: null, currentExercise: null, restTimer: 0, isResting: false });
    } catch (error: any) {
      // Si el error es que la sesión no existe, limpiar de todos modos
      if (error.response?.status === 404) {
        set({ activeSession: null, currentExercise: null, restTimer: 0, isResting: false });
        return;
      }
      throw new Error(error.response?.data?.detail || 'Error al eliminar sesión');
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

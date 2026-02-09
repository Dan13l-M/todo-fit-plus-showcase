import { create } from 'zustand';
import { tasksApi } from '../services/api';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface FitnessMetadata {
  routine_id?: string;
  exercise_id?: string;
  target_weight?: number;
  target_reps?: number;
  achievement_code?: string;
  workouts_per_week?: number;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  due_date?: string;
  completed_at?: string;
  category?: string;
  tags: string[];
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_days: number[];
  subtasks: Subtask[];
  linked_to_fitness: boolean;
  fitness_link_type?: string;
  fitness_metadata?: FitnessMetadata;
  reminder_enabled: boolean;
  reminder_time?: string;
  order: number;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  category?: string;
  tags?: string;
  completed?: boolean;
  overdue?: boolean;
  due_today?: boolean;
  due_this_week?: boolean;
  linked_to_fitness?: boolean;
  search?: string;
}

export interface TaskStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  by_priority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  by_status: {
    todo: number;
    in_progress: number;
    completed: number;
  };
  overdue_tasks: number;
  due_today: number;
  completed_today: number;
  completed_this_week: number;
  completed_this_month: number;
  fitness_tasks: {
    total: number;
    completed: number;
    pending: number;
  };
  task_streak_days: number;
}

export interface FitnessSuggestion {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  linked_to_fitness: boolean;
  fitness_link_type: string;
  fitness_metadata: any;
  icon: string;
}

interface TaskState {
  tasks: Task[];
  stats: TaskStats | null;
  suggestions: FitnessSuggestion[];
  loading: boolean;
  error: string | null;
  activeFilters: TaskFilters;

  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (taskData: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  
  // Subtasks
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  
  // Stats & Suggestions
  fetchStats: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  checkFitnessProgress: () => Promise<void>;
  
  // Filters
  setFilters: (filters: TaskFilters) => void;
  clearFilters: () => void;
  
  // Utils
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  stats: null,
  suggestions: [],
  loading: false,
  error: null,
  activeFilters: {},

  fetchTasks: async (filters?: TaskFilters) => {
    set({ loading: true, error: null });
    try {
      const tasks = await tasksApi.getTasks(filters);
      set({ tasks, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Error al cargar tareas',
        loading: false 
      });
    }
  },

  createTask: async (taskData: Partial<Task>) => {
    set({ loading: true, error: null });
    try {
      const newTask = await tasksApi.createTask(taskData);
      set((state) => ({ 
        tasks: [newTask, ...state.tasks],
        loading: false 
      }));
      return newTask;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Error al crear tarea',
        loading: false 
      });
      throw error;
    }
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    set({ loading: true, error: null });
    try {
      const updatedTask = await tasksApi.updateTask(id, updates);
      set((state) => ({
        tasks: state.tasks.map((task) => 
          task.id === id ? updatedTask : task
        ),
        loading: false
      }));
      return updatedTask;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Error al actualizar tarea',
        loading: false 
      });
      throw error;
    }
  },

  deleteTask: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await tasksApi.deleteTask(id);
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Error al eliminar tarea',
        loading: false 
      });
    }
  },

  toggleTask: async (id: string) => {
    try {
      const updatedTask = await tasksApi.toggleTask(id);
      set((state) => ({
        tasks: state.tasks.map((task) => 
          task.id === id ? updatedTask : task
        )
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Error al actualizar tarea' });
    }
  },

  addSubtask: async (taskId: string, title: string) => {
    try {
      await tasksApi.addSubtask(taskId, title);
      // Refetch the task to get updated subtasks
      await get().fetchTasks(get().activeFilters);
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Error al agregar subtarea' });
    }
  },

  toggleSubtask: async (taskId: string, subtaskId: string) => {
    try {
      await tasksApi.toggleSubtask(taskId, subtaskId);
      await get().fetchTasks(get().activeFilters);
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Error al actualizar subtarea' });
    }
  },

  deleteSubtask: async (taskId: string, subtaskId: string) => {
    try {
      await tasksApi.deleteSubtask(taskId, subtaskId);
      await get().fetchTasks(get().activeFilters);
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Error al eliminar subtarea' });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await tasksApi.getStats();
      set({ stats });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Error al cargar estadísticas' });
    }
  },

  fetchSuggestions: async () => {
    try {
      const response = await tasksApi.getFitnessSuggestions();
      set({ suggestions: response.suggestions });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Error al cargar sugerencias' });
    }
  },

  checkFitnessProgress: async () => {
    try {
      const result = await tasksApi.checkFitnessProgress();
      // Refetch tasks to get updated status
      await get().fetchTasks(get().activeFilters);
    } catch (error: any) {
      console.error('Error checking fitness progress:', error);
      set({ error: error.response?.data?.detail || 'Error al verificar progreso' });
    }
  },

  setFilters: (filters: TaskFilters) => {
    set({ activeFilters: filters });
    get().fetchTasks(filters);
  },

  clearFilters: () => {
    set({ activeFilters: {} });
    get().fetchTasks({});
  },

  clearError: () => {
    set({ error: null });
  },
}));

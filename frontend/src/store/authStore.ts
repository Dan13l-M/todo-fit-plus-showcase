import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  
  login: async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      await AsyncStorage.setItem('token', response.access_token);
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      // Manejar diferentes tipos de errores
      if (error.response) {
        const detail = error.response.data?.detail;
        const status = error.response.status;
        
        // Errores específicos del backend
        if (status === 401) {
          // "Invalid email or password" del backend
          throw new Error('Correo o contraseña incorrectos');
        } else if (detail && typeof detail === 'string') {
          throw new Error(detail);
        } else {
          throw new Error('Error al iniciar sesión. Verifica tus credenciales.');
        }
      } else if (error.request) {
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else {
        throw new Error('Error inesperado. Intenta de nuevo.');
      }
    }
  },
  
  register: async (email: string, username: string, password: string, fullName?: string) => {
    try {
      const response = await authApi.register({ email, username, password, full_name: fullName });
      await AsyncStorage.setItem('token', response.access_token);
      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      // Manejar diferentes tipos de errores
      if (error.response) {
        const detail = error.response.data?.detail;
        const status = error.response.status;
        
        // Errores específicos del backend (status 400)
        if (detail === 'Email already registered') {
          throw new Error('Este correo ya está registrado. Intenta iniciar sesión.');
        } else if (detail === 'Username already taken') {
          throw new Error('Este nombre de usuario ya está en uso. Elige otro.');
        } else if (status === 400 && detail && typeof detail === 'string') {
          throw new Error(detail);
        } else if (detail && typeof detail === 'string') {
          throw new Error(detail);
        } else {
          throw new Error('Error al registrarse. Verifica tus datos.');
        }
      } else if (error.request) {
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else {
        throw new Error('Error inesperado. Intenta de nuevo.');
      }
    }
  },
  
  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
  
  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      
      const user = await authApi.getMe();
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Auth check error:', err);
      await AsyncStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
  
  updateUser: (user: User) => {
    set({ user });
  },
}));

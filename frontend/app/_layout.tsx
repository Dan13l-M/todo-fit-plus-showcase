import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { adminApi } from '../src/services/api';

export default function RootLayout() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Check authentication on app load
    checkAuth();
    
    // Seed exercises and achievements on first load (only if available)
    const seedData = async () => {
      try {
        await adminApi.seedExercises();
        await adminApi.seedAchievements();
        console.log('✅ Data seeded successfully');
      } catch (err: any) {
        // Silently skip if endpoints don't exist (404) or data already seeded
        if (err?.response?.status === 404) {
          // Admin endpoints not available on this backend - that's fine
        } else if (err?.response?.status === 400) {
          // Data already seeded - that's fine
        } else {
          // Other errors - log but don't crash
          console.log('Seed data skipped (backend may not support it)');
        }
      }
    };
    seedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0f0f1a',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="create-routine" 
          options={{ 
            title: 'Crear Rutina',
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="create-task" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="task-detail/[id]" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="select-exercises"
          options={{ 
            title: 'Seleccionar Ejercicios',
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="active-workout" 
          options={{ 
            title: 'Entrenamiento',
            headerShown: false,
          }} 
        />
      </Stack>
    </>
  );
}

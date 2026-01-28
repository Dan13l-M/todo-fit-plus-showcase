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
    
    // Seed exercises on first load
    const seedData = async () => {
      try {
        await adminApi.seedExercises();
      } catch (error) {
        // Already seeded or error - ignore
      }
    };
    seedData();
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="create-routine" 
          options={{ 
            title: 'Crear Rutina',
            presentation: 'modal',
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

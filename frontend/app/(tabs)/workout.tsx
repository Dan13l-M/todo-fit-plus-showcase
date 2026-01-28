import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { routinesApi, sessionsApi } from '../../src/services/api';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { Routine } from '../../src/types';

export default function WorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeSession, loadActiveSession } = useWorkoutStore();
  
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Check for active session
      await loadActiveSession();
      
      // Fetch routines
      const data = await routinesApi.getAll();
      setRoutines(data);
      
      // If routineId was passed, select that routine
      if (params.routineId) {
        const routine = data.find(r => r.id === params.routineId);
        if (routine) setSelectedRoutine(routine);
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [params.routineId])
  );

  const handleStartWorkout = async (withRoutine: boolean) => {
    try {
      const sessionData = withRoutine && selectedRoutine 
        ? { routine_id: selectedRoutine.id }
        : {};
      
      await useWorkoutStore.getState().startSession(sessionData.routine_id);
      router.push('/active-workout');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleContinueWorkout = () => {
    router.push('/active-workout');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // If there's an active session, show continue option
  if (activeSession) {
    return (
      <View style={styles.container}>
        <View style={styles.activeSessionCard}>
          <View style={styles.activeSessionIcon}>
            <Ionicons name="barbell" size={48} color="#4F46E5" />
          </View>
          <Text style={styles.activeSessionTitle}>Entrenamiento en progreso</Text>
          <Text style={styles.activeSessionText}>
            {activeSession.routine_name || 'Entrenamiento libre'}
          </Text>
          <View style={styles.activeSessionStats}>
            <View style={styles.activeStat}>
              <Text style={styles.activeStatValue}>{activeSession.total_sets}</Text>
              <Text style={styles.activeStatLabel}>Series</Text>
            </View>
            <View style={styles.activeStat}>
              <Text style={styles.activeStatValue}>{activeSession.total_volume_kg.toFixed(0)}</Text>
              <Text style={styles.activeStatLabel}>kg</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueWorkout}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.continueButtonText}>Continuar Entrenamiento</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Iniciar Entrenamiento</Text>
      
      {/* Quick Start */}
      <TouchableOpacity
        style={styles.quickStartCard}
        onPress={() => handleStartWorkout(false)}
      >
        <View style={styles.quickStartIcon}>
          <Ionicons name="flash" size={32} color="#f97316" />
        </View>
        <View style={styles.quickStartInfo}>
          <Text style={styles.quickStartTitle}>Inicio Rápido</Text>
          <Text style={styles.quickStartText}>Entrenamiento libre sin rutina predefinida</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#4b5563" />
      </TouchableOpacity>

      {/* Routines Section */}
      <Text style={styles.sectionTitle}>Mis Rutinas</Text>
      
      {routines.length > 0 ? (
        routines.map((routine) => (
          <TouchableOpacity
            key={routine.id}
            style={[
              styles.routineCard,
              selectedRoutine?.id === routine.id && styles.routineCardSelected
            ]}
            onPress={() => setSelectedRoutine(routine)}
          >
            <View style={styles.routineInfo}>
              <Text style={styles.routineName}>{routine.name}</Text>
              <Text style={styles.routineDetails}>
                {routine.routine_type.replace('_', ' ')} • {routine.exercises.length} ejercicios
              </Text>
            </View>
            {selectedRoutine?.id === routine.id && (
              <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
            )}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyRoutines}>
          <Text style={styles.emptyText}>No tienes rutinas creadas</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/create-routine')}
          >
            <Text style={styles.createButtonText}>Crear Rutina</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selected Routine Preview */}
      {selectedRoutine && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Ejercicios de la rutina</Text>
          {selectedRoutine.exercises.map((ex, index) => (
            <View key={ex.id} style={styles.exercisePreview}>
              <Text style={styles.exerciseOrder}>{index + 1}</Text>
              <View style={styles.exercisePreviewInfo}>
                <Text style={styles.exercisePreviewName}>{ex.exercise_name}</Text>
                <Text style={styles.exercisePreviewSets}>
                  {ex.sets_planned} x {ex.reps_planned || `${ex.reps_min}-${ex.reps_max}`}
                  {ex.target_weight_kg ? ` @ ${ex.target_weight_kg}kg` : ''}
                </Text>
              </View>
            </View>
          ))}
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartWorkout(true)}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.startButtonText}>Comenzar Rutina</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  quickStartIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStartInfo: {
    flex: 1,
    marginLeft: 16,
  },
  quickStartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  quickStartText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routineCardSelected: {
    borderColor: '#4F46E5',
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  routineDetails: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  emptyRoutines: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  previewSection: {
    marginTop: 24,
  },
  exercisePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  exerciseOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '600',
    marginRight: 12,
  },
  exercisePreviewInfo: {
    flex: 1,
  },
  exercisePreviewName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  exercisePreviewSets: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  startButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeSessionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  activeSessionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  activeSessionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  activeSessionText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
  },
  activeSessionStats: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 32,
  },
  activeStat: {
    alignItems: 'center',
    marginHorizontal: 32,
  },
  activeStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  activeStatLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

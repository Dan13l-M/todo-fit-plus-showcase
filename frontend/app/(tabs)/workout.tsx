import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { routinesApi, exercisesApi, sessionsApi } from '../../src/services/api';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { Routine, Exercise } from '../../src/types';

export default function WorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeSession, loadActiveSession } = useWorkoutStore();
  
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Quick Start modal states
  const [showQuickStartModal, setShowQuickStartModal] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.routineId])
  );

  const handleStartWorkout = async (withRoutine: boolean) => {
    if (withRoutine) {
      // Start with selected routine
      try {
        if (!selectedRoutine) {
          Alert.alert('Error', 'Selecciona una rutina');
          return;
        }
        await useWorkoutStore.getState().startSession(selectedRoutine.id);
        router.push('/active-workout');
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    } else {
      // Quick Start - show exercise selection modal
      await handleOpenQuickStart();
    }
  };

  const handleOpenQuickStart = async () => {
    setLoadingExercises(true);
    setShowQuickStartModal(true);
    try {
      const exercises = await exercisesApi.getAll({ limit: 500 });
      setAllExercises(exercises);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los ejercicios');
      setShowQuickStartModal(false);
    } finally {
      setLoadingExercises(false);
    }
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExerciseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const handleConfirmQuickStart = async () => {
    if (selectedExerciseIds.size === 0) {
      Alert.alert('Atención', 'Selecciona al menos un ejercicio');
      return;
    }

    try {
      // 1. Create session without routine_id
      const session = await sessionsApi.start({});
      
      // 2. Add all selected exercises
      let order = 1;
      for (const exerciseId of Array.from(selectedExerciseIds)) {
        await sessionsApi.addExercise(session.id, exerciseId, order++);
      }
      
      // 3. Reload active session in store
      await loadActiveSession();
      
      // 4. Navigate to active workout
      setShowQuickStartModal(false);
      setSelectedExerciseIds(new Set());
      setExerciseSearchQuery('');
      router.push('/active-workout');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al iniciar Quick Start');
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

      {/* Quick Start Exercise Selection Modal */}
      <Modal
        visible={showQuickStartModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQuickStartModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecciona Ejercicios</Text>
            <TouchableOpacity onPress={() => {
              setShowQuickStartModal(false);
              setSelectedExerciseIds(new Set());
              setExerciseSearchQuery('');
            }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ejercicio..."
            placeholderTextColor="#6b7280"
            value={exerciseSearchQuery}
            onChangeText={setExerciseSearchQuery}
          />

          <Text style={styles.selectionCount}>
            {selectedExerciseIds.size} ejercicio{selectedExerciseIds.size !== 1 ? 's' : ''} seleccionado{selectedExerciseIds.size !== 1 ? 's' : ''}
          </Text>

          {loadingExercises ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Cargando ejercicios...</Text>
            </View>
          ) : (
            <ScrollView style={styles.exerciseList}>
              {allExercises
                .filter(ex =>
                  exerciseSearchQuery.trim() === '' ||
                  ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
                  ex.muscle.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
                )
                .map(exercise => {
                  const isSelected = selectedExerciseIds.has(exercise.id);
                  return (
                    <TouchableOpacity
                      key={exercise.id}
                      style={[
                        styles.exerciseListItem,
                        isSelected && styles.exerciseListItemSelected
                      ]}
                      onPress={() => toggleExerciseSelection(exercise.id)}
                    >
                      <View style={styles.exerciseListItemContent}>
                        <Text style={styles.exerciseListItemName}>{exercise.name}</Text>
                        <Text style={styles.exerciseListItemMuscle}>{exercise.muscle}</Text>
                      </View>
                      <View style={styles.checkbox}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color="#4F46E5" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowQuickStartModal(false);
                setSelectedExerciseIds(new Set());
                setExerciseSearchQuery('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedExerciseIds.size === 0 && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirmQuickStart}
              disabled={selectedExerciseIds.size === 0}
            >
              <Text style={styles.confirmButtonText}>Comenzar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 20,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  selectionCount: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  exerciseList: {
    flex: 1,
    marginBottom: 16,
  },
  exerciseListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 8,
  },
  exerciseListItemSelected: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  exerciseListItemContent: {
    flex: 1,
  },
  exerciseListItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseListItemMuscle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#4a4a6a',
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
});

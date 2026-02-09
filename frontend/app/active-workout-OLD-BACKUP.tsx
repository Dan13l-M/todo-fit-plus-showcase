import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Vibration,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../src/store/workoutStore';
import { exercisesApi } from '../src/services/api';
import { Exercise } from '../src/types';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeSession, completeSession, deleteSession, addSet, loadActiveSession } = useWorkoutStore();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {
        if (restTimerRef.current) clearInterval(restTimerRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const fetchData = async () => {
    try {
      await loadActiveSession();
      const exercisesData = await exercisesApi.getAll({ limit: 100 });
      setExercises(exercisesData);
      
      // Auto-select first exercise from routine if available
      const session = useWorkoutStore.getState().activeSession;
      if (session?.exercises && session.exercises.length > 0 && !selectedExercise) {
        const firstRoutineExercise = exercisesData.find(
          ex => ex.id === session.exercises[0].exercise_id
        );
        if (firstRoutineExercise) {
          setSelectedExercise(firstRoutineExercise);
        }
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRestTimer = (seconds: number) => {
    setRestTime(seconds);
    setIsResting(true);
    
    restTimerRef.current = setInterval(() => {
      setRestTime(prev => {
        if (prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          setIsResting(false);
          Vibration.vibrate([0, 500, 200, 500]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTime(0);
    setIsResting(false);
  };

  const handleAddSet = async () => {
    if (!selectedExercise) {
      Alert.alert('Error', 'Selecciona un ejercicio');
      return;
    }
    
    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);
    
    if (isNaN(weightNum) || weightNum < 0) {
      Alert.alert('Error', 'Ingresa un peso válido');
      return;
    }
    
    if (isNaN(repsNum) || repsNum < 1) {
      Alert.alert('Error', 'Ingresa las repeticiones');
      return;
    }
    
    setSaving(true);
    try {
      const result = await addSet(selectedExercise.id, {
        set_number: currentSetNumber,
        reps_completed: repsNum,
        weight_kg: weightNum,
      });
      
      // Check for PR
      if (result.is_pr) {
        Vibration.vibrate([0, 300, 100, 300, 100, 500]);
        Alert.alert('🏆 ¡Nuevo PR!', `¡Felicidades! Nuevo récord en ${selectedExercise.name}: ${weightNum}kg x ${repsNum}`);
      }
      
      setCurrentSetNumber(prev => prev + 1);
      setWeight('');
      setReps('');
      
      // Start rest timer
      startRestTimer(90);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinishWorkout = () => {
    console.log('handleFinishWorkout called, activeSession:', activeSession?.id);
    
    if (!activeSession) {
      Alert.alert('Error', 'No hay sesión activa');
      return;
    }
    
    Alert.alert(
      'Finalizar Entrenamiento',
      '¿Estás seguro de que quieres terminar el entrenamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            console.log('Finalizando sesión:', activeSession.id);
            try {
              // Limpiar timer de descanso si está activo
              if (restTimerRef.current) {
                clearInterval(restTimerRef.current);
              }
              setIsResting(false);
              setRestTime(0);
              
              await completeSession();
              console.log('Sesión completada exitosamente');
              
              Alert.alert('¡Excelente!', 'Entrenamiento completado', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') }
              ]);
            } catch (error: any) {
              console.log('Error al completar:', error);
              Alert.alert('Error', error.message || 'No se pudo completar el entrenamiento');
            }
          },
        },
      ]
    );
  };

  const handleDeleteWorkout = () => {
    Alert.alert(
      'Eliminar Entrenamiento',
      '¿Estás seguro de que quieres eliminar este entrenamiento? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Limpiar timer de descanso si está activo
              if (restTimerRef.current) {
                clearInterval(restTimerRef.current);
              }
              setIsResting(false);
              setRestTime(0);
              
              await deleteSession();
              
              Alert.alert('Eliminado', 'Entrenamiento eliminado', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') }
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el entrenamiento');
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!activeSession) {
    return (
      <View style={styles.noSessionContainer}>
        <Ionicons name="warning" size={64} color="#f97316" />
        <Text style={styles.noSessionText}>No hay sesión activa</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeSession.routine_name || 'Entrenamiento'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleDeleteWorkout} style={{ marginRight: 12 }}>
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFinishWorkout}>
            <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Ionicons name="layers" size={18} color="#4F46E5" />
          <Text style={styles.statValue}>{activeSession.total_sets}</Text>
          <Text style={styles.statLabel}>Series</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="fitness" size={18} color="#22c55e" />
          <Text style={styles.statValue}>{activeSession.total_volume_kg.toFixed(0)}</Text>
          <Text style={styles.statLabel}>kg</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="repeat" size={18} color="#f97316" />
          <Text style={styles.statValue}>{activeSession.total_reps}</Text>
          <Text style={styles.statLabel}>Reps</Text>
        </View>
      </View>

      {/* Rest Timer Overlay */}
      {isResting && (
        <View style={styles.restOverlay}>
          <Text style={styles.restLabel}>Descanso</Text>
          <Text style={styles.restTimer}>{formatTime(restTime)}</Text>
          <TouchableOpacity style={styles.skipButton} onPress={skipRest}>
            <Text style={styles.skipButtonText}>Saltar</Text>
          </TouchableOpacity>
          
          {/* Acciones durante el descanso */}
          <View style={styles.restActions}>
            <TouchableOpacity style={styles.restFinishButton} onPress={handleFinishWorkout}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.restFinishText}>Finalizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restDeleteButton} onPress={handleDeleteWorkout}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
              <Text style={styles.restDeleteText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Exercise Selector */}
        <TouchableOpacity
          style={styles.exerciseSelector}
          onPress={() => setShowExerciseSelector(!showExerciseSelector)}
        >
          <Text style={styles.exerciseSelectorLabel}>Ejercicio actual:</Text>
          <Text style={styles.exerciseSelectorValue}>
            {selectedExercise?.name || 'Selecciona un ejercicio'}
          </Text>
          <Ionicons name="chevron-down" size={24} color="#9ca3af" />
        </TouchableOpacity>

        {/* Exercise List (collapsible) */}
        {showExerciseSelector && (
          <View style={styles.exerciseList}>
            {/* Show routine exercises first if available */}
            {activeSession.exercises && activeSession.exercises.length > 0 ? (
              <>
                <Text style={styles.exerciseListHeader}>Ejercicios de la rutina:</Text>
                {activeSession.exercises.map((sessionEx, index) => {
                  const fullExercise = exercises.find(ex => ex.id === sessionEx.exercise_id);
                  if (!fullExercise) return null;
                  return (
                    <TouchableOpacity
                      key={sessionEx.id}
                      style={[
                        styles.exerciseItem,
                        selectedExercise?.id === fullExercise.id && styles.exerciseItemSelected,
                        styles.routineExerciseItem
                      ]}
                      onPress={() => {
                        setSelectedExercise(fullExercise);
                        setShowExerciseSelector(false);
                        setCurrentSetNumber(1);
                      }}
                    >
                      <View style={styles.exerciseItemContent}>
                        <Text style={styles.exerciseItemNumber}>{index + 1}</Text>
                        <View style={styles.exerciseItemInfo}>
                          <Text style={styles.exerciseItemName}>{fullExercise.name}</Text>
                          <Text style={styles.exerciseItemMuscle}>{fullExercise.muscle}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.exerciseListHeader}>Otros ejercicios:</Text>
              </>
            ) : null}
            {/* Show all exercises */}
            {exercises
              .filter(ex => !activeSession.exercises?.some(se => se.exercise_id === ex.id))
              .map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[
                    styles.exerciseItem,
                    selectedExercise?.id === ex.id && styles.exerciseItemSelected
                  ]}
                  onPress={() => {
                    setSelectedExercise(ex);
                    setShowExerciseSelector(false);
                    setCurrentSetNumber(1);
                  }}
                >
                  <Text style={styles.exerciseItemName}>{ex.name}</Text>
                  <Text style={styles.exerciseItemMuscle}>{ex.muscle}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Current Exercise Sets */}
        {selectedExercise && activeSession.exercises && (
          <View style={styles.setsSection}>
            <Text style={styles.setsTitle}>Series registradas</Text>
            {activeSession.exercises
              .filter(e => e.exercise_id === selectedExercise.id)
              .flatMap(e => e.sets)
              .map((set, index) => (
                <View key={set.id || index} style={styles.setRow}>
                  <Text style={styles.setNumber}>Set {set.set_number}</Text>
                  <Text style={styles.setDetails}>
                    {set.weight_kg}kg x {set.reps_completed}
                  </Text>
                  {set.is_pr && (
                    <Ionicons name="trophy" size={16} color="#ffd700" />
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputTitle}>Set #{currentSetNumber}</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Peso (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6b7280"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addSetButton, saving && styles.addSetButtonDisabled]}
            onPress={handleAddSet}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addSetButtonText}>Registrar Serie</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Finish Button */}
      <TouchableOpacity
        style={styles.finishButton}
        onPress={handleFinishWorkout}
      >
        <Ionicons name="checkmark-done" size={24} color="#fff" />
        <Text style={styles.finishButtonText}>Finalizar Entrenamiento</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSessionContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noSessionText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a2e',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  restOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 15, 26, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  restLabel: {
    fontSize: 24,
    color: '#9ca3af',
  },
  restTimer: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginVertical: 24,
  },
  skipButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },  restActions: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 16,
  },
  restFinishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  restFinishText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  restDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  exerciseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseSelectorLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  exerciseSelectorValue: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exerciseList: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 300,
  },
  exerciseListHeader: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  exerciseItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  routineExerciseItem: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  exerciseItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseItemNumber: {
    color: '#4F46E5',
    fontSize: 18,
    fontWeight: 'bold',
    width: 32,
    textAlign: 'center',
  },
  exerciseItemInfo: {
    flex: 1,
  },
  exerciseItemSelected: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  exerciseItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseItemMuscle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  setsSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  setsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  setNumber: {
    color: '#9ca3af',
    width: 60,
  },
  setDetails: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  inputSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  inputTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 8,
  },
  inputLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
  },
  addSetButtonDisabled: {
    opacity: 0.7,
  },
  addSetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  finishButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

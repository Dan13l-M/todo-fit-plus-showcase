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
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useTaskStore } from '../src/store/taskStore';
import { SessionExercise } from '../src/types';

interface PlannedSet {
  setNumber: number;
  repsPlanned: number;
  weightKg?: number;
  completed: boolean;
  completedSetId?: string; // ID from backend when completed
  isWarmup?: boolean; // Flag for warmup sets
}

interface ExerciseWithPlan extends SessionExercise {
  plannedSets: PlannedSet[];
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeSession, completeSession, deleteSession, addSet, updateSet, deleteSet, addExerciseToSession, loadActiveSession } = useWorkoutStore();
  const { checkFitnessProgress } = useTaskStore();
  
  const [exercisesWithPlans, setExercisesWithPlans] = useState<ExerciseWithPlan[]>([]);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  
  // Modal state for completing a set
  const [showSetModal, setShowSetModal] = useState(false);
  const [currentSetToComplete, setCurrentSetToComplete] = useState<PlannedSet | null>(null);
  const [modalWeight, setModalWeight] = useState('');
  const [modalReps, setModalReps] = useState('');
  const [modalRpe, setModalRpe] = useState<number | undefined>();
  const [modalIsWarmup, setModalIsWarmup] = useState(false);
  
  // Modal state for adding exercises
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  
  // Confirmation modals
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSetCompleteSuccess, setShowSetCompleteSuccess] = useState(false);
  
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // React to activeSession changes
  React.useEffect(() => {
    if (activeSession && activeSession.exercises) {
      updateExercisesWithPlans(activeSession);
    }
  }, [activeSession]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {
        if (restTimerRef.current) clearInterval(restTimerRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const updateExercisesWithPlans = (session: typeof activeSession) => {
    if (!session || !session.exercises) {
      setExercisesWithPlans([]);
      return;
    }

    // Convert session exercises to ExercisesWithPlan
    const withPlans: ExerciseWithPlan[] = session.exercises.map((ex) => {
      // Check how many sets are already completed
      const completedSets = ex.sets || [];
      
      // For exercises without planning (Quick Start), use completed sets + 1 placeholder
      const setsPlanned = ex.sets_planned || 0;
      const repsPlanned = ex.reps_planned || 10;
      const targetWeight = ex.target_weight_kg;
      
      const plannedSets: PlannedSet[] = [];
      
      if (setsPlanned > 0) {
        // Has planning from routine - create placeholders
        for (let i = 1; i <= setsPlanned; i++) {
          const completedSet = completedSets.find(s => s.set_number === i);
          
          if (completedSet) {
            plannedSets.push({
              setNumber: i,
              repsPlanned: completedSet.reps_completed,
              weightKg: completedSet.weight_kg,
              completed: true,
              completedSetId: completedSet.id,
              isWarmup: completedSet.is_warmup,
            });
          } else {
            plannedSets.push({
              setNumber: i,
              repsPlanned: repsPlanned,
              weightKg: targetWeight,
              completed: false,
            });
          }
        }
      } else {
        // No planning (Quick Start) - show ONLY completed sets, no automatic placeholder
        // User must use "Agregar serie adicional" button to add more sets
        completedSets.forEach(set => {
          plannedSets.push({
            setNumber: set.set_number,
            repsPlanned: set.reps_completed,
            weightKg: set.weight_kg,
            completed: true,
            completedSetId: set.id,
            isWarmup: set.is_warmup,
          });
        });
      }
      
      return {
        ...ex,
        plannedSets,
      };
    });

    setExercisesWithPlans(withPlans);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Load active session if not already loaded
      await loadActiveSession();
    } catch (error) {
      console.log('Error loading session:', error);
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

  const openSetModal = (exercise: ExerciseWithPlan, set: PlannedSet) => {
    setCurrentSetToComplete(set);
    setModalWeight(set.weightKg?.toString() || '');
    setModalReps(set.repsPlanned.toString());
    setModalRpe(undefined);
    setModalIsWarmup(false);
    setShowSetModal(true);
  };

  const completeSetFromModal = async () => {
    if (!currentSetToComplete || !activeSession) return;
    
    const weightNum = parseFloat(modalWeight);
    const repsNum = parseInt(modalReps);
    
    if (isNaN(repsNum) || repsNum < 1) {
      // Show custom error modal instead of Alert
      Alert.alert('⚠️ Error', 'Las repeticiones deben ser mayor a 0');
      return;
    }
    
    if (isNaN(weightNum) || weightNum < 0) {
      Alert.alert('⚠️ Error', 'El peso no puede ser negativo');
      return;
    }
    
    try {
      const exercise = exercisesWithPlans[selectedExerciseIndex];
      
      const setDataToSave = {
        set_number: currentSetToComplete.setNumber,
        reps_completed: repsNum,
        weight_kg: weightNum,
        rpe: modalRpe,
        is_warmup: modalIsWarmup,
        is_failure: false,
      };
      
      // Check if this is an update or a new set
      if (currentSetToComplete.completed && currentSetToComplete.completedSetId) {
        // Update existing set
        await updateSet(currentSetToComplete.completedSetId, setDataToSave);
        // No modal, just close
      } else {
        // Add new set
        await addSet(exercise.exercise_id, setDataToSave);
        
        // Start rest timer if available
        if (exercise.rest_seconds && !modalIsWarmup) {
          startRestTimer(exercise.rest_seconds);
        }
        
        // Show brief success indicator
        setShowSetCompleteSuccess(true);
        setTimeout(() => setShowSetCompleteSuccess(false), 1500);
      }
      
      // fetchData will be triggered automatically by useEffect when activeSession changes
      setShowSetModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al completar serie');
    }
  };

  const handleOpenAddExercise = async () => {
    try {
      // Load available exercises
      const { exercisesApi } = await import('../src/services/api');
      const exercises = await exercisesApi.getAll({ limit: 500 });
      setAvailableExercises(exercises);
      setShowAddExerciseModal(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los ejercicios');
    }
  };

  const handleAddExercise = async (exerciseId: string) => {
    try {
      await addExerciseToSession(exerciseId);
      // Reload session to get updated exercises list
      await loadActiveSession();
      setShowAddExerciseModal(false);
      setExerciseSearchQuery('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al agregar ejercicio');
    }
  };

  const handleFinishWorkout = () => {
    setShowFinishConfirm(true);
  };

  const confirmFinishWorkout = async () => {
    setShowFinishConfirm(false);
    
    // Show success modal BEFORE clearing session
    setShowSuccessModal(true);
    
    try {
      await completeSession();
    } catch (error: any) {
      console.error('Error finishing workout:', error);
      setShowSuccessModal(false);
      Alert.alert('Error', error.message || 'Error al finalizar');
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.replace('/(tabs)');
    
    // Check fitness progress in background
    checkFitnessProgress()
      .catch(err => console.error('Error checking fitness progress:', err));
  };

  const handleDeleteWorkout = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteWorkout = async () => {
    setShowDeleteConfirm(false);
    try {
      await deleteSession();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al eliminar');
    }
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

  if (!activeSession && !showSuccessModal) {
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

  // If session was completed and showing success modal, render empty container with modals
  if (!activeSession && showSuccessModal) {
    return (
      <View style={styles.container}>
        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          animationType="fade"
          transparent={true}
          onRequestClose={handleSuccessClose}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.successCard}>
              <Ionicons name="trophy" size={80} color="#fbbf24" />
              <Text style={styles.successTitle}>¡Sesión Completada!</Text>
              <Text style={styles.successMessage}>
                ¡Excelente trabajo! Cada entrenamiento te acerca más a tus objetivos. 💪
              </Text>
              
              <TouchableOpacity
                style={styles.successButton}
                onPress={handleSuccessClose}
              >
                <Text style={styles.successButtonText}>¡Vamos!</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const currentExercise = exercisesWithPlans[selectedExerciseIndex];
  const completedSetsCount = currentExercise?.plannedSets.filter(s => s.completed).length || 0;
  const totalSetsCount = currentExercise?.plannedSets.length || 0;

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
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* No exercises message */}
        {exercisesWithPlans.length === 0 ? (
          <View style={styles.noExercisesContainer}>
            <Ionicons name="barbell-outline" size={64} color="#6b7280" />
            <Text style={styles.noExercisesTitle}>No hay ejercicios</Text>
            <Text style={styles.noExercisesText}>
              Presiona el botón + para agregar un ejercicio
            </Text>
            <TouchableOpacity
              style={styles.addFirstExerciseButton}
              onPress={handleOpenAddExercise}
            >
              <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
              <Text style={styles.addFirstExerciseText}>Agregar ejercicio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Exercise Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseTabs}>
              {exercisesWithPlans.map((ex, index) => {
            const completedCount = ex.plannedSets.filter(s => s.completed).length;
            const totalCount = ex.plannedSets.length;
            const isComplete = completedCount === totalCount;
            
            return (
              <TouchableOpacity
                key={ex.id}
                style={[
                  styles.exerciseTab,
                  selectedExerciseIndex === index && styles.exerciseTabActive,
                  isComplete && styles.exerciseTabComplete,
                ]}
                onPress={() => setSelectedExerciseIndex(index)}
              >
                <Text style={[
                  styles.exerciseTabNumber,
                  selectedExerciseIndex === index && styles.exerciseTabNumberActive,
                  isComplete && styles.exerciseTabNumberComplete,
                ]}>
                  {index + 1}
                </Text>
                <Text 
                  style={[
                    styles.exerciseTabName,
                    selectedExerciseIndex === index && styles.exerciseTabNameActive,
                    isComplete && styles.exerciseTabNameComplete,
                  ]} 
                  numberOfLines={1}
                >
                  {ex.exercise_name}
                </Text>
                <Text style={[
                  styles.exerciseTabProgress,
                  selectedExerciseIndex === index && styles.exerciseTabProgressActive,
                ]}>
                  {completedCount}/{totalCount}
                </Text>
                {isComplete && (
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Current Exercise Details */}
        {currentExercise && (
          <View style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>{currentExercise.exercise_name}</Text>
                <Text style={styles.exerciseProgress}>
                  {completedSetsCount} de {totalSetsCount} series completadas
                </Text>
              </View>
              {currentExercise.rest_seconds && (
                <View style={styles.restBadge}>
                  <Ionicons name="timer-outline" size={16} color="#4F46E5" />
                  <Text style={styles.restBadgeText}>{currentExercise.rest_seconds}s</Text>
                </View>
              )}
            </View>

            {/* Sets Checklist */}
            <View style={styles.setsChecklist}>
              {currentExercise.plannedSets.map((set) => (
                <TouchableOpacity
                  key={set.setNumber}
                  style={[
                    styles.setItem,
                    set.completed && styles.setItemCompleted,
                  ]}
                  onPress={() => {
                    // Allow editing completed sets
                    openSetModal(currentExercise, set);
                  }}
                >
                  <View style={styles.setCheckbox}>
                    {set.completed ? (
                      <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={28} color="#6b7280" />
                    )}
                  </View>
                  
                  <View style={styles.setInfo}>
                    <View style={styles.setHeader}>
                      <Text style={[styles.setNumber, set.completed && styles.setNumberCompleted]}>
                        Set {set.setNumber}
                      </Text>
                      {set.isWarmup && (
                        <View style={styles.warmupBadge}>
                          <Ionicons name="flame-outline" size={12} color="#f97316" />
                          <Text style={styles.warmupBadgeText}>Calentamiento</Text>
                        </View>
                      )}
                    </View>
                    {set.completed ? (
                      <Text style={styles.setDetails}>
                        {set.weightKg}kg × {set.repsPlanned} reps
                      </Text>
                    ) : (
                      <Text style={styles.setPlanned}>
                        {set.weightKg ? `${set.weightKg}kg × ` : ''}{set.repsPlanned} reps
                      </Text>
                    )}
                  </View>

                  {set.completed ? (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => openSetModal(currentExercise, set)}
                    >
                      <Ionicons name="create-outline" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.completeButton}
                      onPress={() => openSetModal(currentExercise, set)}
                    >
                      <Text style={styles.completeButtonText}>Completar</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Add Extra Set Button */}
            <TouchableOpacity 
              style={styles.addSetButton}
              onPress={() => {
                const nextSetNumber = currentExercise.plannedSets.length + 1;
                const newSet: PlannedSet = {
                  setNumber: nextSetNumber,
                  repsPlanned: currentExercise.reps_planned || 10,
                  weightKg: currentExercise.target_weight_kg,
                  completed: false,
                };
                openSetModal(currentExercise, newSet);
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
              <Text style={styles.addSetButtonText}>Agregar serie adicional</Text>
            </TouchableOpacity>
          </View>
        )}
        </>
        )}
      </ScrollView>

      {/* Complete Set Modal */}
      <Modal
        visible={showSetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentExercise?.exercise_name}
              </Text>
              <Text style={styles.modalSubtitle}>
                Set #{currentSetToComplete?.setNumber}
              </Text>
            </View>

            <View style={styles.modalBody}>
              {/* Weight Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={modalWeight}
                  onChangeText={setModalWeight}
                  keyboardType="decimal-pad"
                  placeholder="60"
                  placeholderTextColor="#6b7280"
                />
              </View>

              {/* Reps Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Repeticiones</Text>
                <TextInput
                  style={styles.input}
                  value={modalReps}
                  onChangeText={setModalReps}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor="#6b7280"
                />
              </View>

              {/* RPE Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RPE (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rpeSelector}>
                  {[6, 7, 8, 9, 10].map((rpe) => (
                    <TouchableOpacity
                      key={rpe}
                      style={[
                        styles.rpeButton,
                        modalRpe === rpe && styles.rpeButtonSelected,
                      ]}
                      onPress={() => setModalRpe(rpe === modalRpe ? undefined : rpe)}
                    >
                      <Text style={[
                        styles.rpeButtonText,
                        modalRpe === rpe && styles.rpeButtonTextSelected,
                      ]}>
                        {rpe}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Warmup Toggle */}
              <TouchableOpacity
                style={styles.warmupToggle}
                onPress={() => setModalIsWarmup(!modalIsWarmup)}
              >
                <Ionicons 
                  name={modalIsWarmup ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={modalIsWarmup ? "#4F46E5" : "#6b7280"} 
                />
                <Text style={styles.warmupToggleText}>Serie de calentamiento</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              {currentSetToComplete?.completed && (
                <TouchableOpacity
                  style={styles.modalDeleteButton}
                  onPress={() => {
                    Alert.alert(
                      'Eliminar Serie',
                      '¿Estás seguro de que deseas eliminar esta serie?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Eliminar',
                          style: 'destructive',
                          onPress: async () => {
                            if (currentSetToComplete?.completedSetId) {
                              try {
                                await deleteSet(currentSetToComplete.completedSetId);
                                setShowSetModal(false);
                                Alert.alert('✓', 'Serie eliminada');
                              } catch (error: any) {
                                Alert.alert('Error', error.message || 'Error al eliminar serie');
                              }
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSetModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={completeSetFromModal}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.modalSaveText}>
                  {currentSetToComplete?.completed ? 'Actualizar' : 'Completar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Exercise Modal */}
      <Modal
        visible={showAddExerciseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Ejercicio</Text>
              <TouchableOpacity onPress={() => setShowAddExerciseModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar ejercicio..."
                placeholderTextColor="#6b7280"
                value={exerciseSearchQuery}
                onChangeText={setExerciseSearchQuery}
              />

              <ScrollView style={styles.exerciseListModal}>
                {availableExercises
                  .filter(ex => 
                    ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) &&
                    !exercisesWithPlans.some(ewp => ewp.exercise_id === ex.id)
                  )
                  .map(exercise => (
                    <TouchableOpacity
                      key={exercise.id}
                      style={styles.exerciseListItem}
                      onPress={() => handleAddExercise(exercise.id)}
                    >
                      <View>
                        <Text style={styles.exerciseListItemName}>{exercise.name}</Text>
                        <Text style={styles.exerciseListItemMuscle}>{exercise.muscle}</Text>
                      </View>
                      <Ionicons name="add-circle" size={28} color="#4F46E5" />
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Finish Confirmation Modal */}
      <Modal
        visible={showFinishConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowFinishConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            <Text style={styles.confirmTitle}>Finalizar Entrenamiento</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro de que deseas finalizar esta sesión?
            </Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => setShowFinishConfirm(false)}
              >
                <Text style={styles.confirmButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonSuccess]}
                onPress={confirmFinishWorkout}
              >
                <Text style={styles.confirmButtonText}>Finalizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.successCard}>
            <Ionicons name="trophy" size={80} color="#fbbf24" />
            <Text style={styles.successTitle}>¡Sesión Completada!</Text>
            <Text style={styles.successMessage}>
              ¡Excelente trabajo! Cada entrenamiento te acerca más a tus objetivos. 💪
            </Text>
            
            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessClose}
            >
              <Text style={styles.successButtonText}>¡Vamos!</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Ionicons name="warning" size={64} color="#ef4444" />
            <Text style={styles.confirmTitle}>Eliminar Entrenamiento</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro? Se perderá todo el progreso de esta sesión.
            </Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonDanger]}
                onPress={confirmDeleteWorkout}
              >
                <Text style={styles.confirmButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Complete Success Toast */}
      {showSetCompleteSuccess && (
        <View style={styles.successToast}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={styles.successToastText}>¡Serie completada! 💪</Text>
        </View>
      )}

      {/* Floating Add Exercise Button */}
      {!loading && activeSession && !isResting && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleOpenAddExercise}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
  noSessionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    padding: 24,
  },
  noSessionText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
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
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  exerciseTabs: {
    marginBottom: 16,
  },
  exerciseTab: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exerciseTabActive: {
    borderColor: '#4F46E5',
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  exerciseTabComplete: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  exerciseTabNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 4,
  },
  exerciseTabNumberActive: {
    color: '#4F46E5',
  },
  exerciseTabNumberComplete: {
    color: '#22c55e',
  },
  exerciseTabName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseTabNameActive: {
    color: '#fff',
  },
  exerciseTabNameComplete: {
    color: '#22c55e',
  },
  exerciseTabProgress: {
    fontSize: 12,
    color: '#6b7280',
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseTabProgressActive: {
    color: '#4F46E5',
  },
  exerciseCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseProgress: {
    fontSize: 14,
    color: '#9ca3af',
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restBadgeText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  setsChecklist: {
    gap: 12,
  },
  setItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  setItemCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  setCheckbox: {
    marginRight: 12,
  },
  setInfo: {
    flex: 1,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  setNumberCompleted: {
    color: '#22c55e',
  },
  warmupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  warmupBadgeText: {
    fontSize: 10,
    color: '#f97316',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  setDetails: {
    fontSize: 14,
    color: '#9ca3af',
  },
  setPlanned: {
    fontSize: 14,
    color: '#6b7280',
  },
  completeButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addSetButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalBody: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2d2d44',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  rpeSelector: {
    flexDirection: 'row',
  },
  rpeButton: {
    backgroundColor: '#2d2d44',
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rpeButtonSelected: {
    backgroundColor: '#4F46E5',
  },
  rpeButtonText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rpeButtonTextSelected: {
    color: '#fff',
  },
  warmupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
  },
  warmupToggleText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#2d2d44',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#2d2d44',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  exerciseListModal: {
    maxHeight: 400,
  },
  exerciseListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
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
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#4F46E5',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  noExercisesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  noExercisesTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  noExercisesText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  addFirstExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2d2d44',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  addFirstExerciseText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  // Confirmation Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonCancel: {
    backgroundColor: '#374151',
  },
  confirmButtonSuccess: {
    backgroundColor: '#22c55e',
  },
  confirmButtonDanger: {
    backgroundColor: '#ef4444',
  },
  confirmButtonTextCancel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Success Modal Styles
  successCard: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // Success Toast Styles
  successToast: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  successToastText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

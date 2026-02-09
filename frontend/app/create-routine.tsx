import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { routinesApi, exercisesApi } from '../src/services/api';
import { Exercise } from '../src/types';

const ROUTINE_TYPES = [
  { id: 'PUSH', label: 'Push', icon: 'arrow-forward', color: '#ef4444', muscles: ['Pecho', 'Hombro', 'Tríceps'] },
  { id: 'PULL', label: 'Pull', icon: 'arrow-back', color: '#3b82f6', muscles: ['Espalda', 'Bíceps', 'Antebrazo'] },
  { id: 'LEGS', label: 'Piernas', icon: 'footsteps', color: '#22c55e', muscles: ['Cuádriceps', 'Isquiotibiales', 'Glúteo', 'Pantorrilla'] },
  { id: 'UPPER_BODY', label: 'Tren Superior', icon: 'body', color: '#f97316', muscles: [], isExclude: true }, // Exclude lower body
  { id: 'LOWER_BODY', label: 'Tren Inferior', icon: 'fitness', color: '#8b5cf6', muscles: ['Cuádriceps', 'Isquiotibiales', 'Glúteo', 'Pantorrilla'] },
  { id: 'FREE', label: 'Libre', icon: 'shuffle', color: '#6b7280', muscles: [] },
];

const DIFFICULTY_LEVELS = [
  { id: 'Beginner', label: 'Principiante' },
  { id: 'Intermediate', label: 'Intermedio' },
  { id: 'Advanced', label: 'Avanzado' },
];

interface SelectedExercise {
  exercise: Exercise;
  order: number;
  sets: number;
  reps: number;
  weight: number;
}

export default function CreateRoutineScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [routineType, setRoutineType] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => { fetchExercises(); }, []);
  useEffect(() => { 
    filterExercisesByType(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineType, allExercises, searchQuery]);

  const fetchExercises = async () => {
    setLoadingExercises(true);
    try {
      const data = await exercisesApi.getAll({ limit: 500 });
      setAllExercises(data);
    } catch (error) { 
      console.log('Error fetching exercises:', error);
      Alert.alert('Error', 'No se pudieron cargar los ejercicios.');
    }
    finally { setLoadingExercises(false); }
  };

  const filterExercisesByType = () => {
    const selectedType = ROUTINE_TYPES.find(t => t.id === routineType);
    let filtered = allExercises;
    
    if (selectedType) {
      if (selectedType.id === 'UPPER_BODY') {
        // Exclude lower body muscles
        const lowerBodyMuscles = ['cuádriceps', 'glúteo', 'isquiotibiales', 'pantorrilla'];
        filtered = allExercises.filter(ex => 
          !lowerBodyMuscles.some(m => ex.muscle.toLowerCase().includes(m))
        );
      } else if (selectedType.muscles.length > 0) {
        // Include only specified muscles (case-insensitive)
        filtered = allExercises.filter(ex => 
          selectedType.muscles.some(m => ex.muscle.toLowerCase().includes(m.toLowerCase()))
        );
      }
      // FREE type has empty muscles array, so no filter applied
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(q) || ex.muscle.toLowerCase().includes(q)
      );
    }
    setFilteredExercises(filtered);
  };

  const toggleTempExercise = (exercise: Exercise) => {
    setTempSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exercise.id)) {
        newSet.delete(exercise.id);
      } else {
        newSet.add(exercise.id);
      }
      return newSet;
    });
  };

  const isInRoutine = (id: string) => selectedExercises.some(e => e.exercise.id === id);

  const confirmAddExercises = () => {
    const exercisesToAdd = allExercises.filter(ex => 
      tempSelectedIds.has(ex.id) && !isInRoutine(ex.id)
    );
    
    if (exercisesToAdd.length === 0) {
      setShowExerciseModal(false);
      setTempSelectedIds(new Set());
      setSearchQuery('');
      return;
    }

    const startOrder = selectedExercises.length;
    const newExercises: SelectedExercise[] = exercisesToAdd.map((ex, index) => ({
      exercise: ex,
      order: startOrder + index + 1,
      sets: 3,
      reps: 10,
      weight: 0,
    }));

    setSelectedExercises(prev => [...prev, ...newExercises]);
    setTempSelectedIds(new Set());
    setShowExerciseModal(false);
    setSearchQuery('');
  };

  const openExerciseModal = () => {
    setTempSelectedIds(new Set(selectedExercises.map(e => e.exercise.id)));
    setShowExerciseModal(true);
  };

  const closeExerciseModal = () => {
    setTempSelectedIds(new Set());
    setShowExerciseModal(false);
    setSearchQuery('');
  };

  const removeExercise = (id: string) => {
    setSelectedExercises(prev => 
      prev.filter(e => e.exercise.id !== id)
        .map((e, i) => ({ ...e, order: i + 1 }))
    );
  };

  const updateConfig = (id: string, field: 'sets' | 'reps' | 'weight', value: number) => {
    setSelectedExercises(prev => 
      prev.map(e => e.exercise.id === id ? { ...e, [field]: value } : e)
    );
  };

  const moveExercise = (id: string, dir: 'up' | 'down') => {
    setSelectedExercises(prev => {
      const i = prev.findIndex(e => e.exercise.id === id);
      const ni = dir === 'up' ? i - 1 : i + 1;
      if (ni < 0 || ni >= prev.length) return prev;
      const arr = [...prev];
      [arr[i], arr[ni]] = [arr[ni], arr[i]];
      return arr.map((e, idx) => ({ ...e, order: idx + 1 }));
    });
  };

  const handleNextStep = () => {
    if (!name.trim()) { 
      Alert.alert('Error', 'Ingresa un nombre para la rutina'); 
      return; 
    }
    if (!routineType) { 
      Alert.alert('Error', 'Selecciona un tipo de rutina'); 
      return; 
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (selectedExercises.length === 0) { 
      Alert.alert('Error', 'Agrega al menos un ejercicio'); 
      return; 
    }
    
    setLoading(true);
    try {
      await routinesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        routine_type: routineType,
        difficulty_level: difficulty,
        exercises: selectedExercises.map(e => ({
          exercise_id: e.exercise.id,
          exercise_order: e.order,
          sets_planned: e.sets,
          reps_planned: e.reps,
          target_weight_kg: e.weight > 0 ? e.weight : undefined,
          rest_seconds: 90,
        })),
      });
      
      Alert.alert('¡Éxito!', 'Rutina creada', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.log('Error creating routine:', error);
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo crear la rutina.');
    } finally { 
      setLoading(false); 
    }
  };

  if (step === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva Rutina</Text>
          <View style={{ width: 28 }} />
        </View>
        
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: Push Day A" 
              placeholderTextColor="#6b7280" 
              value={name} 
              onChangeText={setName} 
            />
          </View>
          
          <View style={styles.section}>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Describe tu rutina..." 
              placeholderTextColor="#6b7280" 
              value={description} 
              onChangeText={setDescription} 
              multiline 
              numberOfLines={3} 
            />
          </View>
          
          <View style={styles.section}>
            <Text style={styles.label}>Tipo *</Text>
            <View style={styles.typeGrid}>
              {ROUTINE_TYPES.map((type) => (
                <TouchableOpacity 
                  key={type.id} 
                  style={[
                    styles.typeCard, 
                    routineType === type.id && { 
                      borderColor: type.color, 
                      backgroundColor: type.color + '20' 
                    }
                  ]} 
                  onPress={() => setRoutineType(type.id)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={routineType === type.id ? type.color : '#6b7280'} 
                  />
                  <Text style={[
                    styles.typeLabel, 
                    routineType === type.id && { color: type.color }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.label}>Dificultad</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_LEVELS.map((level) => (
                <TouchableOpacity 
                  key={level.id} 
                  style={[
                    styles.difficultyButton, 
                    difficulty === level.id && styles.difficultyButtonActive
                  ]} 
                  onPress={() => setDifficulty(level.id)}
                >
                  <Text style={[
                    styles.difficultyText, 
                    difficulty === level.id && styles.difficultyTextActive
                  ]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
            <Text style={styles.nextButtonText}>Siguiente: Ejercicios</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.stepHeaderInfo}>
          <Text style={styles.stepHeaderTitle}>{name}</Text>
          <Text style={styles.stepHeaderSubtitle}>{selectedExercises.length} ejercicio(s)</Text>
        </View>
      </View>
      
      <ScrollView style={styles.exercisesList} contentContainerStyle={styles.exercisesListContent}>
        {selectedExercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyText}>No hay ejercicios</Text>
            <Text style={styles.emptySubtext}>Toca + para agregar</Text>
          </View>
        ) : (
          selectedExercises.map((item, index) => (
            <View key={item.exercise.id} style={styles.selectedCard}>
              <View style={styles.selectedHeader}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{item.order}</Text>
                </View>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{item.exercise.name}</Text>
                  <Text style={styles.selectedMuscle}>{item.exercise.muscle}</Text>
                </View>
                <View style={styles.selectedActions}>
                  <TouchableOpacity onPress={() => moveExercise(item.exercise.id, 'up')} disabled={index === 0}>
                    <Ionicons name="chevron-up" size={20} color={index === 0 ? '#4b5563' : '#fff'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveExercise(item.exercise.id, 'down')} disabled={index === selectedExercises.length - 1}>
                    <Ionicons name="chevron-down" size={20} color={index === selectedExercises.length - 1 ? '#4b5563' : '#fff'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeExercise(item.exercise.id)} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.configRow}>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Series</Text>
                  <View style={styles.configInputRow}>
                    <TouchableOpacity style={styles.configButton} onPress={() => updateConfig(item.exercise.id, 'sets', Math.max(1, item.sets - 1))}>
                      <Ionicons name="remove" size={16} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.configValue}>{item.sets}</Text>
                    <TouchableOpacity style={styles.configButton} onPress={() => updateConfig(item.exercise.id, 'sets', item.sets + 1)}>
                      <Ionicons name="add" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Reps</Text>
                  <View style={styles.configInputRow}>
                    <TouchableOpacity style={styles.configButton} onPress={() => updateConfig(item.exercise.id, 'reps', Math.max(1, item.reps - 1))}>
                      <Ionicons name="remove" size={16} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.configValue}>{item.reps}</Text>
                    <TouchableOpacity style={styles.configButton} onPress={() => updateConfig(item.exercise.id, 'reps', item.reps + 1)}>
                      <Ionicons name="add" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Peso</Text>
                  <TextInput 
                    style={styles.weightInput} 
                    value={item.weight > 0 ? item.weight.toString() : ''} 
                    onChangeText={(t) => updateConfig(item.exercise.id, 'weight', parseFloat(t) || 0)} 
                    keyboardType="numeric" 
                    placeholder="0" 
                    placeholderTextColor="#6b7280" 
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      
      <TouchableOpacity style={styles.fab} onPress={openExerciseModal}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
      
      {selectedExercises.length > 0 && (
        <TouchableOpacity style={[styles.createButton, loading && styles.createButtonDisabled]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Crear Rutina</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      
      <Modal visible={showExerciseModal} animationType="slide" transparent onRequestClose={closeExerciseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeExerciseModal}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Seleccionar Ejercicios</Text>
              <TouchableOpacity onPress={confirmAddExercises}>
                <Text style={styles.confirmText}>Listo ({Math.max(0, tempSelectedIds.size - selectedExercises.length)})</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Buscar..." 
                placeholderTextColor="#6b7280" 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            {routineType !== 'FREE' && (
              <Text style={styles.filterInfo}>Filtrando: {ROUTINE_TYPES.find(t => t.id === routineType)?.label}</Text>
            )}
            
            {tempSelectedIds.size > selectedExercises.length && (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionText}>{tempSelectedIds.size - selectedExercises.length} nuevo(s)</Text>
              </View>
            )}
            
            {loadingExercises ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
            ) : (
              <FlatList 
                data={filteredExercises} 
                keyExtractor={(item) => item.id} 
                contentContainerStyle={styles.exerciseModalList}
                ListEmptyComponent={<Text style={styles.noExercisesText}>No se encontraron ejercicios</Text>} 
                renderItem={({ item }) => {
                  const isSelected = tempSelectedIds.has(item.id);
                  const alreadyInRoutine = isInRoutine(item.id);
                  
                  return (
                    <TouchableOpacity 
                      style={[styles.exerciseModalItem, isSelected && styles.exerciseModalItemSelected]} 
                      onPress={() => toggleTempExercise(item)}
                    >
                      <View style={styles.exerciseModalInfo}>
                        <Text style={styles.exerciseModalName}>{item.name}</Text>
                        <Text style={styles.exerciseModalMuscle}>{item.muscle} • {item.equipment}</Text>
                        {alreadyInRoutine && <Text style={styles.inRoutineText}>Ya en la rutina</Text>}
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                }} 
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, backgroundColor: '#1a1a2e' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  scrollContent: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  input: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2d2d44' },
  textArea: { height: 100, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeCard: { width: '31%', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  typeLabel: { fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  difficultyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  difficultyButton: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4, borderWidth: 2, borderColor: 'transparent' },
  difficultyButtonActive: { borderColor: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.2)' },
  difficultyText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  difficultyTextActive: { color: '#4F46E5' },
  nextButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, marginTop: 16 },
  nextButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginRight: 8 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  stepHeaderInfo: { flex: 1, marginLeft: 12 },
  stepHeaderTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  stepHeaderSubtitle: { fontSize: 14, color: '#9ca3af', marginTop: 2 },
  exercisesList: { flex: 1 },
  exercisesListContent: { padding: 16, paddingBottom: 180 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { color: '#9ca3af', fontSize: 20, marginTop: 16, fontWeight: '600' },
  emptySubtext: { color: '#6b7280', fontSize: 14, marginTop: 8 },
  selectedCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 12 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  orderBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  orderText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  selectedMuscle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  selectedActions: { flexDirection: 'row', alignItems: 'center' },
  configRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#2d2d44', paddingTop: 12 },
  configItem: { alignItems: 'center', flex: 1 },
  configLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  configInputRow: { flexDirection: 'row', alignItems: 'center' },
  configButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  configValue: { color: '#fff', fontSize: 18, fontWeight: '600', marginHorizontal: 12, minWidth: 30, textAlign: 'center' },
  weightInput: { backgroundColor: '#2d2d44', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 16, textAlign: 'center', width: 70 },
  fab: { position: 'absolute', right: 16, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  createButton: { position: 'absolute', bottom: 24, left: 16, right: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#22c55e', borderRadius: 12, padding: 16 },
  createButtonDisabled: { opacity: 0.7 },
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', minHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2d2d44' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  confirmText: { color: '#4F46E5', fontSize: 16, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f0f1a', borderRadius: 12, margin: 16, paddingHorizontal: 16 },
  searchInput: { flex: 1, height: 48, color: '#fff', fontSize: 16, marginLeft: 12 },
  filterInfo: { color: '#9ca3af', fontSize: 12, marginHorizontal: 16, marginBottom: 8 },
  selectionSummary: { backgroundColor: '#4F46E520', paddingVertical: 8, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 8, borderRadius: 8 },
  selectionText: { color: '#4F46E5', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  exerciseModalList: { padding: 16, paddingBottom: 40 },
  exerciseModalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f0f1a', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  exerciseModalItemSelected: { borderColor: '#4F46E5', backgroundColor: '#4F46E510' },
  exerciseModalInfo: { flex: 1 },
  exerciseModalName: { fontSize: 16, fontWeight: '500', color: '#fff' },
  exerciseModalMuscle: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  inRoutineText: { fontSize: 11, color: '#22c55e', marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#4b5563', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  noExercisesText: { color: '#9ca3af', textAlign: 'center', marginTop: 40, fontSize: 16 },
});

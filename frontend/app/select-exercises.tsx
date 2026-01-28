import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { exercisesApi, routinesApi } from '../src/services/api';
import { Exercise } from '../src/types';

export default function SelectExercisesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const routineId = params.routineId as string;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<{ exercise: Exercise; order: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, selectedMuscle, searchQuery]);

  const fetchData = async () => {
    try {
      const [exercisesData, muscles] = await Promise.all([
        exercisesApi.getAll({ limit: 200 }),
        exercisesApi.getMuscleGroups(),
      ]);
      setExercises(exercisesData);
      setMuscleGroups(muscles);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = exercises;
    
    if (selectedMuscle) {
      filtered = filtered.filter(ex => 
        ex.muscle.toLowerCase() === selectedMuscle.toLowerCase()
      );
    }
    
    if (searchQuery) {
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.muscle.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredExercises(filtered);
  };

  const toggleExercise = (exercise: Exercise) => {
    const exists = selectedExercises.find(e => e.exercise.id === exercise.id);
    if (exists) {
      setSelectedExercises(prev => prev.filter(e => e.exercise.id !== exercise.id));
    } else {
      setSelectedExercises(prev => [
        ...prev,
        { exercise, order: prev.length + 1 }
      ]);
    }
  };

  const handleSave = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un ejercicio');
      return;
    }

    setSaving(true);
    try {
      for (const item of selectedExercises) {
        await routinesApi.addExercise(routineId, {
          exercise_id: item.exercise.id,
          exercise_order: item.order,
          sets_planned: 3,
          reps_planned: 10,
          rest_seconds: 90,
        });
      }
      
      Alert.alert(
        'Éxito',
        `Se agregaron ${selectedExercises.length} ejercicios a la rutina`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'No se pudieron agregar los ejercicios');
    } finally {
      setSaving(false);
    }
  };

  const renderMuscleFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.muscleChip,
        selectedMuscle === item && styles.muscleChipActive
      ]}
      onPress={() => setSelectedMuscle(selectedMuscle === item ? null : item)}
    >
      <Text
        style={[
          styles.muscleChipText,
          selectedMuscle === item && styles.muscleChipTextActive
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderExercise = ({ item }: { item: Exercise }) => {
    const isSelected = selectedExercises.some(e => e.exercise.id === item.id);
    const order = selectedExercises.find(e => e.exercise.id === item.id)?.order;

    return (
      <TouchableOpacity
        style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
        onPress={() => toggleExercise(item)}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.exerciseMuscle}>
            {item.muscle} • {item.equipment}
          </Text>
        </View>
        {isSelected ? (
          <View style={styles.orderBadge}>
            <Text style={styles.orderText}>{order}</Text>
          </View>
        ) : (
          <Ionicons name="add-circle-outline" size={24} color="#4b5563" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ejercicio..."
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

      {/* Muscle Filters */}
      <FlatList
        data={muscleGroups}
        renderItem={renderMuscleFilter}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.muscleList}
      />

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.exerciseList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color="#4b5563" />
            <Text style={styles.emptyText}>No se encontraron ejercicios</Text>
          </View>
        }
      />

      {/* Selected Count & Save Button */}
      {selectedExercises.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.selectedCount}>
            {selectedExercises.length} ejercicio(s) seleccionado(s)
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  muscleList: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  muscleChip: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  muscleChipActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderColor: '#4F46E5',
  },
  muscleChipText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  muscleChipTextActive: {
    color: '#4F46E5',
  },
  exerciseList: {
    padding: 16,
    paddingBottom: 100,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exerciseCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  exerciseMuscle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a2e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  selectedCount: {
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

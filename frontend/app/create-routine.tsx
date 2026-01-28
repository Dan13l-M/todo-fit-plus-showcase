import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { routinesApi } from '../src/services/api';

const ROUTINE_TYPES = [
  { id: 'PUSH', label: 'Push', icon: 'arrow-forward', color: '#ef4444' },
  { id: 'PULL', label: 'Pull', icon: 'arrow-back', color: '#3b82f6' },
  { id: 'LEGS', label: 'Piernas', icon: 'footsteps', color: '#22c55e' },
  { id: 'UPPER_BODY', label: 'Tren Superior', icon: 'body', color: '#f97316' },
  { id: 'LOWER_BODY', label: 'Tren Inferior', icon: 'fitness', color: '#8b5cf6' },
  { id: 'FREE', label: 'Libre', icon: 'shuffle', color: '#6b7280' },
];

const DIFFICULTY_LEVELS = [
  { id: 'Beginner', label: 'Principiante' },
  { id: 'Intermediate', label: 'Intermedio' },
  { id: 'Advanced', label: 'Avanzado' },
];

export default function CreateRoutineScreen() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [routineType, setRoutineType] = useState('PUSH');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la rutina');
      return;
    }

    setLoading(true);
    try {
      const routine = await routinesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        routine_type: routineType,
        difficulty_level: difficulty,
        exercises: [],
      });
      
      Alert.alert(
        'Rutina Creada',
        '¿Quieres agregar ejercicios ahora?',
        [
          { 
            text: 'Más tarde', 
            onPress: () => router.back() 
          },
          {
            text: 'Agregar ejercicios',
            onPress: () => router.replace({
              pathname: '/select-exercises',
              params: { routineId: routine.id }
            }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo crear la rutina');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Name Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Nombre de la rutina *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Push Day A"
          placeholderTextColor="#6b7280"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Description Input */}
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

      {/* Routine Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Tipo de rutina</Text>
        <View style={styles.typeGrid}>
          {ROUTINE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                routineType === type.id && { borderColor: type.color }
              ]}
              onPress={() => setRoutineType(type.id)}
            >
              <Ionicons
                name={type.icon as any}
                size={24}
                color={routineType === type.id ? type.color : '#6b7280'}
              />
              <Text
                style={[
                  styles.typeLabel,
                  routineType === type.id && { color: type.color }
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Difficulty Level */}
      <View style={styles.section}>
        <Text style={styles.label}>Nivel de dificultad</Text>
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
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === level.id && styles.difficultyTextActive
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Crear Rutina</Text>
          </>
        )}
      </TouchableOpacity>
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeCard: {
    width: '31%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyButtonActive: {
    borderColor: '#4F46E5',
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  difficultyText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  difficultyTextActive: {
    color: '#4F46E5',
  },
  createButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

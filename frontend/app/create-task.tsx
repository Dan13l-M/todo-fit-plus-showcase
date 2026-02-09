import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../src/store/taskStore';
import DateTimePicker from '@react-native-community/datetimepicker';

const PRIORITIES = [
  { id: 'low', label: 'Baja', color: '#6B7280', icon: 'remove-circle' },
  { id: 'medium', label: 'Media', color: '#3B82F6', icon: 'ellipse' },
  { id: 'high', label: 'Alta', color: '#F59E0B', icon: 'warning' },
  { id: 'urgent', label: 'Urgente', color: '#EF4444', icon: 'alert-circle' },
];

const CATEGORIES = [
  { id: 'personal', label: 'Personal', icon: 'person' },
  { id: 'work', label: 'Trabajo', icon: 'briefcase' },
  { id: 'fitness', label: 'Fitness', icon: 'barbell' },
  { id: 'health', label: 'Salud', icon: 'medical' },
  { id: 'shopping', label: 'Compras', icon: 'cart' },
  { id: 'other', label: 'Otro', icon: 'bookmark' },
];

const FITNESS_LINK_TYPES = [
  { id: 'workout_goal', label: 'Meta de Workouts', icon: 'calendar' },
  { id: 'pr_goal', label: 'Meta de PR', icon: 'trophy' },
  { id: 'achievement_goal', label: 'Meta de Logro', icon: 'medal' },
  { id: 'routine_reminder', label: 'Recordatorio de Rutina', icon: 'repeat' },
];

export default function CreateTaskScreen() {
  const router = useRouter();
  const { createTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState('personal');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  
  // Fitness Integration
  const [linkedToFitness, setLinkedToFitness] = useState(false);
  const [fitnessLinkType, setFitnessLinkType] = useState('workout_goal');
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState('3');
  const [targetWeight, setTargetWeight] = useState('');
  const [achievementCode, setAchievementCode] = useState('');

  const [loading, setLoading] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddSubtask = () => {
    if (subtaskInput.trim()) {
      const newSubtask = {
        id: Date.now().toString(),
        title: subtaskInput.trim(),
        completed: false,
      };
      setSubtasks([...subtasks, newSubtask]);
      setSubtaskInput('');
    }
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const taskData: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        status: 'todo',
        completed: false,
        due_date: dueDate?.toISOString(),
        tags,
        subtasks,
        linked_to_fitness: linkedToFitness,
        is_recurring: false,
        recurrence_days: [],
        reminder_enabled: false,
        order: 0,
      };

      if (linkedToFitness) {
        taskData.fitness_link_type = fitnessLinkType;
        taskData.fitness_metadata = {};

        if (fitnessLinkType === 'workout_goal') {
          taskData.fitness_metadata.workouts_per_week = parseInt(workoutsPerWeek) || 3;
        } else if (fitnessLinkType === 'pr_goal') {
          taskData.fitness_metadata.target_weight = parseFloat(targetWeight) || 0;
        } else if (fitnessLinkType === 'achievement_goal') {
          taskData.fitness_metadata.achievement_code = achievementCode;
        }
      }

      await createTask(taskData);
      Alert.alert('Éxito', 'Tarea creada correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la tarea');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Tarea</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Completar 3 workouts esta semana"
            placeholderTextColor="#6B7280"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detalles opcionales..."
            placeholderTextColor="#6B7280"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.chipsContainer}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.chip,
                  priority === p.id && { backgroundColor: p.color },
                ]}
                onPress={() => setPriority(p.id as any)}
              >
                <Ionicons
                  name={p.icon as any}
                  size={16}
                  color={priority === p.id ? '#FFFFFF' : p.color}
                />
                <Text
                  style={[
                    styles.chipText,
                    priority === p.id && styles.chipTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Categoría</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.chip,
                  category === c.id && styles.chipActive,
                ]}
                onPress={() => setCategory(c.id)}
              >
                <Ionicons
                  name={c.icon as any}
                  size={16}
                  color={category === c.id ? '#FFFFFF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.chipText,
                    category === c.id && styles.chipTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Fecha de vencimiento</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
            <Text style={styles.dateButtonText}>
              {dueDate
                ? dueDate.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Sin fecha límite'}
            </Text>
            {dueDate && (
              <TouchableOpacity onPress={() => setDueDate(undefined)}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>Etiquetas</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              placeholder="Agregar etiqueta..."
              placeholderTextColor="#6B7280"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
            />
            <TouchableOpacity onPress={handleAddTag} style={styles.addButton}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsDisplay}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                    <Ionicons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Subtasks */}
        <View style={styles.section}>
          <Text style={styles.label}>Subtareas</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              placeholder="Agregar subtarea..."
              placeholderTextColor="#6B7280"
              value={subtaskInput}
              onChangeText={setSubtaskInput}
              onSubmitEditing={handleAddSubtask}
            />
            <TouchableOpacity onPress={handleAddSubtask} style={styles.addButton}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {subtasks.length > 0 && (
            <View style={styles.subtasksList}>
              {subtasks.map((subtask) => (
                <View key={subtask.id} style={styles.subtaskItem}>
                  <Ionicons name="ellipse-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.subtaskText}>{subtask.title}</Text>
                  <TouchableOpacity onPress={() => handleRemoveSubtask(subtask.id)}>
                    <Ionicons name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Fitness Integration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integración Fitness</Text>
          <View style={styles.switchCard}>
            <View style={styles.switchContent}>
              <View style={styles.switchIcon}>
                <Ionicons name="barbell" size={24} color="#10B981" />
              </View>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Vincular con Fitness</Text>
                <Text style={styles.switchHint}>
                  Se completará automáticamente al alcanzar el objetivo
                </Text>
              </View>
            </View>
            <Switch
              value={linkedToFitness}
              onValueChange={setLinkedToFitness}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={linkedToFitness ? '#FFFFFF' : '#9CA3AF'}
              ios_backgroundColor="#374151"
            />
          </View>

          {linkedToFitness && (
            <>
              <View style={styles.fitnessSection}>
                <Text style={styles.label}>Tipo de objetivo</Text>
                <View style={styles.chipsContainer}>
                  {FITNESS_LINK_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.chip,
                        fitnessLinkType === type.id && styles.chipActive,
                      ]}
                      onPress={() => setFitnessLinkType(type.id)}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={16}
                        color={fitnessLinkType === type.id ? '#FFFFFF' : '#9CA3AF'}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          fitnessLinkType === type.id && styles.chipTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {fitnessLinkType === 'workout_goal' && (
                <View style={styles.fitnessSection}>
                  <Text style={styles.label}>Workouts por semana</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 3"
                    placeholderTextColor="#6B7280"
                    value={workoutsPerWeek}
                    onChangeText={setWorkoutsPerWeek}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {fitnessLinkType === 'pr_goal' && (
                <View style={styles.fitnessSection}>
                  <Text style={styles.label}>Peso objetivo (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 100"
                    placeholderTextColor="#6B7280"
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}

              {fitnessLinkType === 'achievement_goal' && (
                <View style={styles.fitnessSection}>
                  <Text style={styles.label}>Código de logro</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: FIRST_WORKOUT"
                    placeholderTextColor="#6B7280"
                    value={achievementCode}
                    onChangeText={setAchievementCode}
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creando...' : 'Crear Tarea'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#4F46E5',
  },
  chipText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 6,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 6,
  },
  subtasksList: {
    marginTop: 12,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  switchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#374151',
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  switchIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  switchHint: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  fitnessSection: {
    marginTop: 16,
  },
  createButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

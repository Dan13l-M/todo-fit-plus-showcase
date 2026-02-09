import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore, Task } from '../../src/store/taskStore';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, toggleTask, deleteTask, loading } = useTaskStore();
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    const foundTask = tasks.find(t => t.id === id);
    if (foundTask) {
      setTask(foundTask);
    }
  }, [id, tasks]);

  const handleToggle = async () => {
    if (task) {
      await toggleTask(task.id);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar tarea',
      '¿Estás seguro de que quieres eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (task) {
              await deleteTask(task.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading || !task) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#6B7280',
  };

  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push(`/edit-task/${id}`)} 
            style={styles.actionButton}
          >
            <Ionicons name="create-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Title and Status */}
        <View style={styles.section}>
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={handleToggle} style={styles.checkbox}>
              {task.completed ? (
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              ) : (
                <Ionicons name="ellipse-outline" size={32} color={priorityColor} />
              )}
            </TouchableOpacity>
            <Text
              style={[
                styles.title,
                task.completed && styles.completedText,
              ]}
            >
              {task.title}
            </Text>
          </View>
        </View>

        {/* Description */}
        {task.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          
          <View style={styles.metadataRow}>
            <Ionicons name="flag" size={20} color={priorityColor} />
            <Text style={styles.metadataLabel}>Prioridad:</Text>
            <Text style={[styles.metadataValue, { color: priorityColor }]}>
              {task.priority.toUpperCase()}
            </Text>
          </View>

          {task.category && (
            <View style={styles.metadataRow}>
              <Ionicons name="bookmark" size={20} color="#9CA3AF" />
              <Text style={styles.metadataLabel}>Categoría:</Text>
              <Text style={styles.metadataValue}>{task.category}</Text>
            </View>
          )}

          {task.due_date && (
            <View style={styles.metadataRow}>
              <Ionicons name="calendar" size={20} color="#9CA3AF" />
              <Text style={styles.metadataLabel}>Vencimiento:</Text>
              <Text style={styles.metadataValue}>
                {new Date(task.due_date).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          <View style={styles.metadataRow}>
            <Ionicons name="time" size={20} color="#9CA3AF" />
            <Text style={styles.metadataLabel}>Estado:</Text>
            <Text style={styles.metadataValue}>{task.status}</Text>
          </View>
        </View>

        {/* Tags */}
        {task.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Etiquetas</Text>
            <View style={styles.tagsContainer}>
              {task.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Subtareas ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
            </Text>
            {task.subtasks.map((subtask) => (
              <View key={subtask.id} style={styles.subtaskItem}>
                <Ionicons
                  name={subtask.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={subtask.completed ? '#10B981' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.subtaskText,
                    subtask.completed && styles.completedText,
                  ]}
                >
                  {subtask.title}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Fitness Link */}
        {task.linked_to_fitness && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vinculado a Fitness</Text>
            <View style={styles.fitnessCard}>
              <Ionicons name="barbell" size={24} color="#10B981" />
              <View style={styles.fitnessInfo}>
                <Text style={styles.fitnessType}>
                  {task.fitness_link_type?.replace('_', ' ').toUpperCase()}
                </Text>
                {task.fitness_metadata?.workouts_per_week && (
                  <Text style={styles.fitnessDetail}>
                    Meta: {task.fitness_metadata.workouts_per_week} workouts/semana
                  </Text>
                )}
                {task.fitness_metadata?.target_weight && (
                  <Text style={styles.fitnessDetail}>
                    Peso objetivo: {task.fitness_metadata.target_weight} kg
                  </Text>
                )}
                {task.fitness_metadata?.achievement_code && (
                  <Text style={styles.fitnessDetail}>
                    Logro: {task.fitness_metadata.achievement_code}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 4,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 24,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 12,
    marginRight: 8,
  },
  metadataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#9CA3AF',
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
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  fitnessCard: {
    flexDirection: 'row',
    backgroundColor: '#064E3B',
    borderRadius: 12,
    padding: 16,
  },
  fitnessInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fitnessType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  fitnessDetail: {
    fontSize: 14,
    color: '#6EE7B7',
  },
});

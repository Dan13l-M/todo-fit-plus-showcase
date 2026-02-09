import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../store/taskStore';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onPress: (task: Task) => void;
}

const PRIORITY_COLORS = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  personal: 'person',
  work: 'briefcase',
  fitness: 'barbell',
  health: 'medical',
  shopping: 'cart',
  other: 'bookmark',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onPress }) => {
  const priorityColor = PRIORITY_COLORS[task.priority];
  const categoryIcon = CATEGORY_ICONS[task.category || 'other'];
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
  const isDueToday = task.due_date && 
    new Date(task.due_date).toDateString() === new Date().toDateString();
  
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana';
    } else {
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Pressable
      onPress={() => onPress(task)}
      style={[
        styles.card,
        { borderLeftColor: priorityColor, borderLeftWidth: 4 },
        task.completed && styles.completedCard,
        isOverdue && styles.overdueCard,
        isDueToday && styles.dueTodayCard,
      ]}
    >
      {/* Header with checkbox and title */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onToggle(task.id)}
          style={[
            styles.checkbox,
            task.completed && styles.checkboxCompleted,
            { borderColor: priorityColor },
          ]}
        >
          {task.completed && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              task.completed && styles.completedText,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          
          {task.description && (
            <Text style={styles.description} numberOfLines={1}>
              {task.description}
            </Text>
          )}
        </View>
      </View>

      {/* Tags */}
      {task.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {task.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {task.tags.length > 3 && (
            <Text style={styles.moreText}>+{task.tags.length - 3}</Text>
          )}
        </View>
      )}

      {/* Progress bar for subtasks */}
      {totalSubtasks > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: priorityColor },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedSubtasks}/{totalSubtasks}
          </Text>
        </View>
      )}

      {/* Footer with metadata */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {/* Category */}
          {task.category && (
            <View style={styles.badge}>
              <Ionicons name={categoryIcon} size={14} color="#9CA3AF" />
              <Text style={styles.badgeText}>{task.category}</Text>
            </View>
          )}
          
          {/* Fitness badge */}
          {task.linked_to_fitness && (
            <View style={[styles.badge, styles.fitnessBadge]}>
              <Ionicons name="barbell" size={14} color="#10B981" />
              <Text style={[styles.badgeText, styles.fitnessBadgeText]}>Fitness</Text>
            </View>
          )}
        </View>

        {/* Due date */}
        {task.due_date && (
          <View style={styles.dueDateContainer}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={isOverdue ? '#EF4444' : isDueToday ? '#F59E0B' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.dueDate,
                isOverdue && styles.overdueDateText,
                isDueToday && styles.dueTodayText,
              ]}
            >
              {formatDate(task.due_date)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.7,
  },
  overdueCard: {
    backgroundColor: '#1F2937',
  },
  dueTodayCard: {
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  moreText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
    alignSelf: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  fitnessBadge: {
    backgroundColor: '#064E3B',
  },
  badgeText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  fitnessBadgeText: {
    color: '#10B981',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  overdueDateText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  dueTodayText: {
    color: '#F59E0B',
    fontWeight: '600',
  },
});

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../../src/store/taskStore';
import { TaskCard } from '../../src/components/TaskCard';
import { Task } from '../../src/store/taskStore';

type FilterType = 'all' | 'today' | 'week' | 'overdue' | 'fitness' | 'completed';

export default function TasksScreen() {
  const router = useRouter();
  const {
    tasks,
    loading,
    error,
    fetchTasks,
    toggleTask,
    setFilters,
    clearFilters,
    checkFitnessProgress,
    activeFilters,
  } = useTaskStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Load tasks with "all" filter (only pending) by default
      fetchTasks({ completed: false });
    }, [])
  );

  const loadTasks = async () => {
    // Re-apply current filter
    if (activeFilter === 'all') {
      await fetchTasks({ completed: false });
    } else {
      await fetchTasks(activeFilters);
    }
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
    // Don't check fitness progress on pull-to-refresh
    // Only when user explicitly presses the "Verificar" button
  };

  const handleFilterPress = (filter: FilterType) => {
    setActiveFilter(filter);
    
    switch (filter) {
      case 'all':
        // Show only pending tasks (not completed)
        setFilters({ completed: false });
        break;
      case 'today':
        setFilters({ due_today: true, completed: false });
        break;
      case 'week':
        setFilters({ due_this_week: true, completed: false });
        break;
      case 'overdue':
        setFilters({ overdue: true, completed: false });
        break;
      case 'fitness':
        setFilters({ linked_to_fitness: true, completed: false });
        break;
      case 'completed':
        setFilters({ completed: true });
        break;
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      setFilters({ search: text.trim() });
    } else {
      clearFilters();
      setActiveFilter('all');
    }
  };

  const handleToggle = async (id: string) => {
    await toggleTask(id);
  };

  const handleTaskPress = (task: Task) => {
    router.push(`/task-detail/${task.id}`);
  };

  const handleCreateTask = () => {
    router.push('/create-task');
  };

  const getFilterCount = (filter: FilterType): number => {
    switch (filter) {
      case 'all':
        return tasks.filter(t => !t.completed).length;
      case 'today':
        return tasks.filter(t => {
          if (t.completed || !t.due_date) return false;
          const today = new Date().toDateString();
          return new Date(t.due_date).toDateString() === today;
        }).length;
      case 'week':
        return tasks.filter(t => {
          if (t.completed || !t.due_date) return false;
          const dueDate = new Date(t.due_date);
          const today = new Date();
          const weekFromNow = new Date(today);
          weekFromNow.setDate(today.getDate() + 7);
          return dueDate >= today && dueDate <= weekFromNow;
        }).length;
      case 'overdue':
        return tasks.filter(t => {
          if (t.completed || !t.due_date) return false;
          return new Date(t.due_date) < new Date();
        }).length;
      case 'fitness':
        return tasks.filter(t => t.linked_to_fitness && !t.completed).length;
      case 'completed':
        return tasks.filter(t => t.completed).length;
      default:
        return 0;
    }
  };

  const filters: { type: FilterType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { type: 'all', icon: 'list', label: 'Todas' },
    { type: 'today', icon: 'today', label: 'Hoy' },
    { type: 'week', icon: 'calendar', label: 'Semana' },
    { type: 'overdue', icon: 'alert-circle', label: 'Vencidas' },
    { type: 'fitness', icon: 'barbell', label: 'Fitness' },
    { type: 'completed', icon: 'checkmark-done', label: 'Completadas' },
  ];

  if (loading && !refreshing && tasks.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Mis Tareas</Text>
          <Text style={styles.subtitle}>
            {getFilterCount('all')} pendientes
          </Text>
        </View>
        {getFilterCount('fitness') > 0 && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={async () => {
              await checkFitnessProgress();
              // Re-apply current filter after checking progress
              if (activeFilter === 'all') {
                await fetchTasks({ completed: false });
              } else {
                await fetchTasks(activeFilters);
              }
            }}
          >
            <Ionicons name="sync" size={20} color="#10B981" />
            <Text style={styles.syncButtonText}>Verificar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar tareas..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.type}
          renderItem={({ item }) => {
            const count = getFilterCount(item.type);
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  activeFilter === item.type && styles.filterChipActive,
                ]}
                onPress={() => handleFilterPress(item.type)}
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={activeFilter === item.type ? '#FFFFFF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === item.type && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[
                    styles.badge,
                    activeFilter === item.type && styles.badgeActive,
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      activeFilter === item.type && styles.badgeTextActive,
                    ]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={handleToggle}
            onPress={handleTaskPress}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No se encontraron tareas' : 'No hay tareas'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Intenta con otra búsqueda'
                : 'Crea tu primera tarea para comenzar'}
            </Text>
          </View>
        }
      />

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateTask}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  },
  titleContainer: {
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  syncButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 6,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#6366F1',
  },
  badgeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

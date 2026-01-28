import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { routinesApi } from '../../src/services/api';
import { Routine } from '../../src/types';

const ROUTINE_TYPES: { [key: string]: { color: string; icon: string } } = {
  PUSH: { color: '#ef4444', icon: 'arrow-forward' },
  PULL: { color: '#3b82f6', icon: 'arrow-back' },
  LEGS: { color: '#22c55e', icon: 'footsteps' },
  UPPER_BODY: { color: '#f97316', icon: 'body' },
  LOWER_BODY: { color: '#8b5cf6', icon: 'fitness' },
  FREE: { color: '#6b7280', icon: 'shuffle' },
};

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoutines = async () => {
    try {
      const data = await routinesApi.getAll();
      setRoutines(data);
    } catch (error) {
      console.log('Error fetching routines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoutines();
  };

  const handleDeleteRoutine = (routine: Routine) => {
    Alert.alert(
      'Eliminar Rutina',
      `¿Estás seguro de eliminar "${routine.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await routinesApi.delete(routine.id);
              fetchRoutines();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la rutina');
            }
          },
        },
      ]
    );
  };

  const renderRoutine = ({ item }: { item: Routine }) => {
    const typeConfig = ROUTINE_TYPES[item.routine_type] || ROUTINE_TYPES.FREE;

    return (
      <TouchableOpacity
        style={styles.routineCard}
        onPress={() => router.push({
          pathname: '/workout',
          params: { routineId: item.id }
        })}
        onLongPress={() => handleDeleteRoutine(item)}
      >
        <View style={[styles.routineIcon, { backgroundColor: typeConfig.color }]}>
          <Ionicons name={typeConfig.icon as any} size={24} color="#fff" />
        </View>
        <View style={styles.routineInfo}>
          <Text style={styles.routineName}>{item.name}</Text>
          <Text style={styles.routineType}>{item.routine_type.replace('_', ' ')}</Text>
          <View style={styles.routineStats}>
            <View style={styles.routineStat}>
              <Ionicons name="list-outline" size={14} color="#9ca3af" />
              <Text style={styles.routineStatText}>
                {item.exercises.length} ejercicios
              </Text>
            </View>
            <View style={styles.routineStat}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#9ca3af" />
              <Text style={styles.routineStatText}>
                {item.times_completed}x completada
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#4b5563" />
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
      <FlatList
        data={routines}
        renderItem={renderRoutine}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyTitle}>No tienes rutinas</Text>
            <Text style={styles.emptyText}>Crea tu primera rutina para comenzar</Text>
          </View>
        }
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-routine')}
      >
        <Ionicons name="add" size={32} color="#fff" />
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  routineIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineInfo: {
    flex: 1,
    marginLeft: 12,
  },
  routineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  routineType: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  routineStats: {
    flexDirection: 'row',
    marginTop: 8,
  },
  routineStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  routineStatText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

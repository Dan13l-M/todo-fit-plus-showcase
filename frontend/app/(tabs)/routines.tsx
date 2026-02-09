import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
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
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleRoutineOptions = (routine: Routine) => {
    setSelectedRoutine(routine);
    setShowOptionsModal(true);
  };

  const handleEdit = () => {
    setShowOptionsModal(false);
    if (selectedRoutine) {
      router.push({
        pathname: '/edit-routine/[id]',
        params: { id: selectedRoutine.id }
      });
    }
  };

  const handleDeleteRequest = () => {
    setShowOptionsModal(false);
    setShowDeleteModal(true);
  };

  const confirmDeleteRoutine = async () => {
    if (!selectedRoutine) return;
    
    try {
      await routinesApi.delete(selectedRoutine.id);
      setShowDeleteModal(false);
      setSelectedRoutine(null);
      fetchRoutines();
    } catch (err) {
      Alert.alert('Error', 'No se pudo eliminar la rutina');
    }
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
        onLongPress={() => handleRoutineOptions(item)}
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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rutinas</Text>
          <TouchableOpacity 
            style={styles.aiButton}
            onPress={() => router.push('/ai-routine-builder')}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.aiButtonText}>IA Builder</Text>
          </TouchableOpacity>
      </View>
      
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

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedRoutine?.name}</Text>
            <Text style={styles.modalSubtitle}>Selecciona una opción</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={handleEdit}>
              <Ionicons name="create-outline" size={24} color="#3b82f6" />
              <Text style={styles.modalOptionText}>Editar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalOption, styles.modalOptionDanger]} onPress={handleDeleteRequest}>
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
              <Text style={[styles.modalOptionText, styles.modalOptionTextDanger]}>Eliminar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowOptionsModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="warning-outline" size={48} color="#ef4444" style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Eliminar Rutina</Text>
            <Text style={styles.modalMessage}>¿Estás seguro de eliminar "{selectedRoutine?.name}"?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonDanger]} onPress={confirmDeleteRoutine}>
                <Text style={styles.modalButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOptionDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 12,
  },
  modalOptionTextDanger: {
    color: '#ef4444',
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#374151',
  },
  modalButtonDanger: {
    backgroundColor: '#ef4444',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9ca3af',
  },
});

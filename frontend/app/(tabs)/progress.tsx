import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { progressApi, sessionsApi } from '../../src/services/api';
import { PersonalRecord, WorkoutSession } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProgressScreen() {
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'prs' | 'history'>('prs');

  const fetchData = async () => {
    try {
      const [prsData, sessionsData] = await Promise.all([
        progressApi.getPersonalRecords(),
        sessionsApi.getAll({ limit: 30 }),
      ]);
      setPrs(prsData);
      setSessions(sessionsData.filter(s => s.is_completed));
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prs' && styles.tabActive]}
          onPress={() => setActiveTab('prs')}
        >
          <Ionicons 
            name="trophy" 
            size={20} 
            color={activeTab === 'prs' ? '#4F46E5' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'prs' && styles.tabTextActive]}>
            Récords
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons 
            name="time" 
            size={20} 
            color={activeTab === 'history' ? '#4F46E5' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {activeTab === 'prs' ? (
          // PRs Tab
          prs.length > 0 ? (
            prs.map((pr) => (
              <View key={pr.id} style={styles.prCard}>
                <View style={styles.prIcon}>
                  <Ionicons name="trophy" size={24} color="#ffd700" />
                </View>
                <View style={styles.prInfo}>
                  <Text style={styles.prExercise}>{pr.exercise_name}</Text>
                  <Text style={styles.prType}>
                    {pr.pr_type === 'MAX_WEIGHT' ? 'Peso Máximo' : pr.pr_type}
                  </Text>
                </View>
                <View style={styles.prValue}>
                  <Text style={styles.prValueText}>{pr.value} kg</Text>
                  {pr.reps && <Text style={styles.prReps}>x{pr.reps}</Text>}
                </View>
                <Text style={styles.prDate}>
                  {format(new Date(pr.achieved_at), 'dd MMM', { locale: es })}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color="#4b5563" />
              <Text style={styles.emptyTitle}>Sin récords aún</Text>
              <Text style={styles.emptyText}>
                Completa entrenamientos para registrar tus PRs
              </Text>
            </View>
          )
        ) : (
          // History Tab
          sessions.length > 0 ? (
            sessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionName}>
                    {session.routine_name || 'Entrenamiento libre'}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {format(new Date(session.session_date), 'dd MMM yyyy', { locale: es })}
                  </Text>
                </View>
                <View style={styles.sessionStatsRow}>
                  <View style={styles.sessionStat}>
                    <Ionicons name="time-outline" size={18} color="#9ca3af" />
                    <Text style={styles.sessionStatValue}>
                      {session.duration_minutes || 0} min
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Ionicons name="fitness-outline" size={18} color="#9ca3af" />
                    <Text style={styles.sessionStatValue}>
                      {session.total_volume_kg.toFixed(0)} kg
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Ionicons name="layers-outline" size={18} color="#9ca3af" />
                    <Text style={styles.sessionStatValue}>
                      {session.total_sets} series
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Ionicons name="repeat-outline" size={18} color="#9ca3af" />
                    <Text style={styles.sessionStatValue}>
                      {session.total_reps} reps
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#4b5563" />
              <Text style={styles.emptyTitle}>Sin historial</Text>
              <Text style={styles.emptyText}>
                Completa tu primer entrenamiento
              </Text>
            </View>
          )
        )}
      </ScrollView>
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
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 4,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  tabText: {
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#4F46E5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  prIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prInfo: {
    flex: 1,
    marginLeft: 12,
  },
  prExercise: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  prType: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  prValue: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  prValueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  prReps: {
    fontSize: 12,
    color: '#9ca3af',
  },
  prDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  sessionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sessionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  sessionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStatValue: {
    color: '#9ca3af',
    marginLeft: 4,
    fontSize: 14,
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
    textAlign: 'center',
  },
});

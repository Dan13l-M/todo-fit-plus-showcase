import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { progressApi } from '../../src/services/api';
import { DashboardStats } from '../../src/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await progressApi.getDashboard();
      setStats(data);
    } catch (error) {
      console.log('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Elite': return '#ffd700';
      case 'Advanced': return '#a855f7';
      case 'Intermediate': return '#3b82f6';
      case 'Beginner': return '#22c55e';
      default: return '#9ca3af';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
      }
    >
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Hola, {user?.username || 'Atleta'}</Text>
        <View style={styles.levelBadge}>
          <Ionicons name="trophy" size={16} color={getLevelColor(stats?.account_level || 'Novice')} />
          <Text style={[styles.levelText, { color: getLevelColor(stats?.account_level || 'Novice') }]}>
            {stats?.account_level || 'Novice'}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#f97316' }]}>
            <Ionicons name="flame" size={24} color="#fff" />
          </View>
          <Text style={styles.statValue}>{stats?.current_streak_days || 0}</Text>
          <Text style={styles.statLabel}>Racha actual</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#4F46E5' }]}>
            <Ionicons name="barbell" size={24} color="#fff" />
          </View>
          <Text style={styles.statValue}>{stats?.workouts_this_month || 0}</Text>
          <Text style={styles.statLabel}>Este mes</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#22c55e' }]}>
            <Ionicons name="ribbon" size={24} color="#fff" />
          </View>
          <Text style={styles.statValue}>{stats?.prs_this_month || 0}</Text>
          <Text style={styles.statLabel}>PRs este mes</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#3b82f6' }]}>
            <Ionicons name="fitness" size={24} color="#fff" />
          </View>
          <Text style={styles.statValue}>
            {((stats?.total_volume_kg || 0) / 1000).toFixed(1)}t
          </Text>
          <Text style={styles.statLabel}>Vol. total</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/workout')}
          >
            <Ionicons name="play-circle" size={32} color="#4F46E5" />
            <Text style={styles.actionText}>Entrenar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/create-routine')}
          >
            <Ionicons name="add-circle" size={32} color="#22c55e" />
            <Text style={styles.actionText}>Nueva Rutina</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/progress')}
          >
            <Ionicons name="stats-chart" size={32} color="#f97316" />
            <Text style={styles.actionText}>Ver PRs</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entrenamientos recientes</Text>
        {stats?.recent_sessions && stats.recent_sessions.length > 0 ? (
          stats.recent_sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionName}>
                  {session.routine_name || 'Entrenamiento libre'}
                </Text>
                <Text style={styles.sessionDate}>
                  {format(new Date(session.session_date), 'dd MMM', { locale: es })}
                </Text>
              </View>
              <View style={styles.sessionStats}>
                <View style={styles.sessionStat}>
                  <Ionicons name="time-outline" size={16} color="#9ca3af" />
                  <Text style={styles.sessionStatText}>
                    {session.duration_minutes || 0} min
                  </Text>
                </View>
                <View style={styles.sessionStat}>
                  <Ionicons name="fitness-outline" size={16} color="#9ca3af" />
                  <Text style={styles.sessionStatText}>
                    {session.total_volume_kg.toFixed(0)} kg
                  </Text>
                </View>
                <View style={styles.sessionStat}>
                  <Ionicons name="layers-outline" size={16} color="#9ca3af" />
                  <Text style={styles.sessionStatText}>
                    {session.total_sets} series
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color="#4b5563" />
            <Text style={styles.emptyText}>No hay entrenamientos recientes</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/workout')}
            >
              <Text style={styles.emptyButtonText}>Comenzar ahora</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
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
    fontSize: 14,
    color: '#9ca3af',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStatText: {
    color: '#9ca3af',
    marginLeft: 4,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  emptyText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  emptyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

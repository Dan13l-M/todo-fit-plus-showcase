import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useWorkoutStore } from '../../src/store/workoutStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { clearSession } = useWorkoutStore();

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              clearSession(); // Limpiar sesión de workout
              await logout();
              // La redirección se hace automáticamente por el useEffect
            } catch (error) {
              console.log('Error al cerrar sesión:', error);
            }
          },
        },
      ]
    );
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

  const getNextLevel = (level: string) => {
    switch (level) {
      case 'Novice': return { next: 'Beginner', target: 10000 };
      case 'Beginner': return { next: 'Intermediate', target: 50000 };
      case 'Intermediate': return { next: 'Advanced', target: 150000 };
      case 'Advanced': return { next: 'Elite', target: 500000 };
      default: return null;
    }
  };

  const nextLevelInfo = getNextLevel(user?.account_level || 'Novice');
  const progress = nextLevelInfo 
    ? Math.min((user?.total_volume_kg || 0) / nextLevelInfo.target * 100, 100)
    : 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        
        {/* Level Badge */}
        <View style={[styles.levelBadge, { borderColor: getLevelColor(user?.account_level || 'Novice') }]}>
          <Ionicons name="trophy" size={18} color={getLevelColor(user?.account_level || 'Novice')} />
          <Text style={[styles.levelText, { color: getLevelColor(user?.account_level || 'Novice') }]}>
            {user?.account_level || 'Novice'}
          </Text>
        </View>
      </View>

      {/* Progress to Next Level */}
      {nextLevelInfo && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progreso hacia {nextLevelInfo.next}</Text>
            <Text style={styles.progressPercent}>{progress.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressDetail}>
            {(user?.total_volume_kg || 0).toFixed(0)} / {nextLevelInfo.target.toLocaleString()} kg
          </Text>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={28} color="#f97316" />
          <Text style={styles.statValue}>{user?.current_streak_days || 0}</Text>
          <Text style={styles.statLabel}>Racha Actual</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="ribbon" size={28} color="#ffd700" />
          <Text style={styles.statValue}>{user?.longest_streak_days || 0}</Text>
          <Text style={styles.statLabel}>Mejor Racha</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="fitness" size={28} color="#4F46E5" />
          <Text style={styles.statValue}>
            {((user?.total_volume_kg || 0) / 1000).toFixed(1)}t
          </Text>
          <Text style={styles.statLabel}>Volumen Total</Text>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="settings-outline" size={24} color="#9ca3af" />
          </View>
          <Text style={styles.menuText}>Configuración</Text>
          <Ionicons name="chevron-forward" size={20} color="#4b5563" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="notifications-outline" size={24} color="#9ca3af" />
          </View>
          <Text style={styles.menuText}>Notificaciones</Text>
          <Ionicons name="chevron-forward" size={20} color="#4b5563" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="cloud-download-outline" size={24} color="#9ca3af" />
          </View>
          <Text style={styles.menuText}>Exportar Datos</Text>
          <Ionicons name="chevron-forward" size={20} color="#4b5563" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="help-circle-outline" size={24} color="#9ca3af" />
          </View>
          <Text style={styles.menuText}>Ayuda</Text>
          <Ionicons name="chevron-forward" size={20} color="#4b5563" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ToDoApp Plus v1.0.0</Text>
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
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginTop: 16,
  },
  levelText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  progressCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2d2d44',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  progressDetail: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  menuSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  menuIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    color: '#4b5563',
    marginTop: 24,
    fontSize: 12,
  },
});

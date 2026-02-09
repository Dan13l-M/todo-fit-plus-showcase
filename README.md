# 🏋️ ToDo-Fit Plus

**Aplicación móvil de gestión de tareas y entrenamiento fitness integrado**

Una app híbrida que combina gestión de tareas diarias con seguimiento completo de entrenamientos, permitiendo crear objetivos fitness que se autocompletan al lograrlos.

<div align="center">

![Demo App](frontend/assets/demo/app-showcase.gif)

**[📱 Ver Demo Completo](#-demo-visual)** | **[✨ Features](#-características-principales)** | **[🛠️ Tech Stack](#️-stack-tecnológico)**

</div>

---

## 📱 Demo Visual

<table>
  <tr>
    <td align="center" width="33%">
      <img src="frontend/assets/demo/tasks.png" width="250" alt="Gestión de Tareas"/>
      <br/>
      <b>Gestión de Tareas</b>
      <br/>
      Organiza tu día con categorías y prioridades
    </td>
    <td align="center" width="33%">
      <img src="frontend/assets/demo/workout.png" width="250" alt="Entrenamiento Activo"/>
      <br/>
      <b>Sesión de Entrenamiento</b>
      <br/>
      Temporizador, series y seguimiento en tiempo real
    </td>
    <td align="center" width="33%">
      <img src="frontend/assets/demo/routines.png" width="250" alt="Rutinas"/>
      <br/>
      <b>Rutinas Personalizadas</b>
      <br/>
      +100 ejercicios clasificados por músculo
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="frontend/assets/demo/history.png" width="250" alt="Historial"/>
      <br/>
      <b>Historial Completo</b>
      <br/>
      Revisa tu progreso y entrenamientos pasados
    </td>
    <td align="center" width="33%">
      <img src="frontend/assets/demo/create-routine.png" width="250" alt="Crear Rutina"/>
      <br/>
      <b>Constructor de Rutinas</b>
      <br/>
      Diseña entrenamientos personalizados
    </td>
    <td align="center" width="33%">
      <img src="frontend/assets/demo/dark-theme.png" width="250" alt="Tema Oscuro"/>
      <br/>
      <b>UI Moderna</b>
      <br/>
      Tema oscuro y modales personalizados
    </td>
  </tr>
</table>

### 🎯 Funcionalidad Destacada: Auto-Completado Fitness

<div align="center">
  <img src="frontend/assets/demo/auto-complete-demo.gif" width="300" alt="Auto-completado"/>
  <br/>
  <i>Las tareas fitness se completan automáticamente al alcanzar tus objetivos de entrenamiento</i>
</div>

---

## ✨ Características Principales

### 🎯 Gestión de Tareas
- ✅ Crear, editar y eliminar tareas
- ✅ Categorías: Trabajo, Personal, Fitness
- ✅ Prioridades: Alta, Media, Baja
- ✅ Filtrado por estado (completadas/pendientes)
- ✅ **Tareas fitness con auto-completado inteligente**

### 💪 Sistema de Entrenamiento
- ✅ Crear y editar rutinas personalizadas
- ✅ Biblioteca de +100 ejercicios clasificados
- ✅ Seguimiento de series, repeticiones y peso
- ✅ Temporizador de descanso entre series
- ✅ Historial completo de entrenamientos
- ✅ Agregar ejercicios durante el workout

### 🎨 Interfaz de Usuario
- ✅ Tema oscuro optimizado
- ✅ Modales personalizados (sin alerts nativos)
- ✅ Animaciones fluidas y feedback visual
- ✅ Diseño responsive
- ✅ Navegación por tabs intuitiva

---

## 🚀 Instalación Rápida

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
# Configurar EXPO_PUBLIC_API_URL en .env
npm start
```

---

## 📊 Estado del Proyecto

### ✅ Completado (v1.0.0)

**Funcionalidad Core**
- [x] Autenticación JWT
- [x] CRUD tareas (crear, editar, eliminar)
- [x] CRUD rutinas (crear, editar, eliminar)
- [x] Sesiones de entrenamiento completas
- [x] Auto-completado de tareas fitness
- [x] Historial de workouts

**UI/UX**
- [x] Tema oscuro completo
- [x] Modales personalizados
- [x] Validación de datos
- [x] Manejo de errores
- [x] Estados de carga

**Optimización**
- [x] Código limpio (sin console.logs)
- [x] Lógica de auto-completado corregida
- [x] Performance optimizations

---

## 🔮 Próximas Funcionalidades

### 🎯 Prioridad Alta
- [ ] **IA Routine Builder** (pantalla creada, falta integración)
  - Generación de rutinas con IA
  - Análisis de objetivos y nivel
  - Recomendaciones personalizadas
  
- [ ] **Estadísticas Avanzadas**
  - Gráficos de progreso
  - Personal Records (PRs)
  - Volumen total por músculo

- [ ] **Planificación Semanal**
  - Calendario de entrenamientos
  - Notificaciones
  - Rutinas recurrentes

### 🔧 Prioridad Media
- [ ] Exportar/Importar datos
- [ ] Modo offline completo
- [ ] Personalización (temas, unidades)
- [ ] Videos de ejercicios

### 💡 Futuro
- [ ] Social features
- [ ] Integración con wearables
- [ ] Nutrition tracking
- [ ] Calculadora de 1RM

---

## 📁 Estructura del Proyecto

```
todo-fit-plus/
├── frontend/
│   ├── app/
│   │   ├── (tabs)/              # Navegación principal
│   │   ├── active-workout.tsx   # Sesión activa
│   │   ├── create-routine/      # Nueva rutina
│   │   ├── edit-routine/        # Editar rutina
│   │   ├── create-task.tsx      # Nueva tarea
│   │   ├── edit-task/           # Editar tarea
│   │   └── ai-routine-builder.tsx  # IA (próximamente)
│   └── src/
│       ├── services/            # API client
│       ├── store/               # Zustand state
│       └── types/               # TypeScript types
│
├── backend/
│   ├── server.py               # FastAPI app
│   ├── seed_exercises.py       # Data seeding
│   └── requirements.txt
│
└── README.md
```

---

## 🛠️ Stack Tecnológico

**Frontend**: React Native, Expo Router, Zustand, Axios  
**Backend**: FastAPI, MongoDB, JWT, Motor  
**UI**: Tema oscuro personalizado, modales custom

---

## 📱 Uso

### Entrenar
1. Selecciona una rutina
2. Completa series con peso/reps
3. Usa el temporizador de descanso
4. Finaliza para guardar progreso

### Tareas Fitness
1. Crea tarea tipo "Fitness"
2. Define objetivo (ej: 3 entrenamientos/semana)
3. Entrena normalmente
4. La tarea se completa automáticamente

### Editar Rutinas
1. Long-press en rutina → "Editar"
2. Agrega o quita ejercicios
3. Ajusta series/reps/peso
4. Guarda cambios

---

## 🐛 Issues Conocidos

✅ Ninguno - Sistema estable para producción

---

**Última actualización**: 2026-02-07  
**Versión**: 1.0.0 (Producción Ready)  
**Estado**: ✅ Estable y completamente funcional

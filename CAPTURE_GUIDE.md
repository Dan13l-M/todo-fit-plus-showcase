# 📸 Guía para Capturar Screenshots y GIFs

## 🎯 Objetivo
Crear demos visuales profesionales para el README sin compartir código.

---

## 📱 Screenshots Necesarios

### 1. **tasks.png** - Pantalla de Tareas
- Abre el tab "Tareas"
- Muestra lista con tareas de diferentes categorías
- Incluye al menos una tarea fitness

### 2. **workout.png** - Sesión Activa
- Inicia un entrenamiento
- Captura mientras estás en medio de un ejercicio
- Muestra el temporizador visible

### 3. **routines.png** - Lista de Rutinas
- Abre el tab "Rutinas"
- Muestra varias rutinas creadas
- Asegúrate que se vean los nombres y ejercicios

### 4. **history.png** - Historial
- Abre el tab "Historial"
- Muestra entrenamientos completados
- Incluye fechas y detalles

### 5. **create-routine.png** - Crear Rutina
- Abre la pantalla de crear rutina
- Muestra la biblioteca de ejercicios
- Selecciona algunos ejercicios

### 6. **dark-theme.png** - Tema Oscuro General
- Captura cualquier pantalla que muestre bien el diseño
- Preferiblemente con modales abiertos

---

## 🎬 GIFs Necesarios

### 1. **app-showcase.gif** (15-20 segundos)
**Secuencia completa del flujo principal:**
1. Pantalla de tareas (2s)
2. Navega a rutinas (1s)
3. Selecciona una rutina (1s)
4. Inicia entrenamiento (1s)
5. Completa una serie (3s)
6. Temporizador corriendo (2s)
7. Navega al historial (1s)
8. Muestra workout guardado (2s)

### 2. **auto-complete-demo.gif** (10-15 segundos)
**Demostrar el auto-completado:**
1. Muestra tarea fitness pendiente (2s)
2. Navega a rutinas (1s)
3. Completa un entrenamiento rápido (5s)
4. Vuelve a tareas (1s)
5. Muestra la tarea automáticamente completada (2s)

---

## 🛠️ Herramientas Recomendadas

### Para Android (Emulador o Físico)

#### Screenshots:
1. **Emulador**: Botón de cámara en la barra lateral
2. **Físico**: Power + Volumen abajo

#### GIFs/Video:
1. **AZ Screen Recorder** (gratis, sin marca de agua)
   - Descarga: Play Store
   - Graba → Convierte a GIF con ezgif.com

2. **scrcpy** (para grabar desde PC)
   ```bash
   scrcpy --record demo.mp4
   ```
   - Luego convierte con ffmpeg o ezgif.com

### Para iOS

#### Screenshots:
- Simulador: `Cmd + S`
- Físico: Power + Volumen arriba

#### GIFs/Video:
1. **Simulador**: QuickTime Screen Recording
2. **Físico**: Screen Recording nativo (Centro de Control)

### Convertir Video → GIF

**Opción 1: ezgif.com** (online, fácil)
1. Sube el video
2. Ajusta tamaño a 300-400px ancho
3. FPS: 10-15
4. Descarga GIF optimizado

**Opción 2: ffmpeg** (local, mejor calidad)
```bash
ffmpeg -i input.mp4 -vf "fps=10,scale=300:-1:flags=lanczos" -loop 0 output.gif
```

---

## 📐 Especificaciones

### Screenshots
- **Formato**: PNG
- **Resolución**: Original del emulador (se redimensiona en README)
- **Orientación**: Vertical (portrait)
- **Nombrado**: exacto como se indica arriba

### GIFs
- **Ancho**: 300-400px (para cargar rápido en GitHub)
- **FPS**: 10-15 (suficiente para demos)
- **Duración**: 10-20 segundos máximo
- **Formato**: GIF optimizado
- **Loop**: Infinito

---

## 📂 Guardar Archivos

Coloca todos los archivos en:
```
frontend/assets/demo/
├── tasks.png
├── workout.png
├── routines.png
├── history.png
├── create-routine.png
├── dark-theme.png
├── app-showcase.gif
└── auto-complete-demo.gif
```

---

## ✅ Checklist Final

Antes de hacer commit, verifica:
- [ ] 6 screenshots capturados
- [ ] 2 GIFs creados
- [ ] Tamaño de GIFs < 2MB cada uno
- [ ] Todos los archivos en `frontend/assets/demo/`
- [ ] Nombres exactos (sin espacios ni mayúsculas extra)
- [ ] GIFs hacen loop correctamente
- [ ] Se ve el tema oscuro claramente

---

## 🚀 Pasos Siguientes

1. Captura todos los screenshots y GIFs
2. Colócalos en la carpeta correcta
3. Ejecuta:
   ```bash
   git add frontend/assets/demo/
   git add README.md
   git commit -m "Add visual demo assets"
   git push
   ```
4. El README se actualizará automáticamente en GitHub

---

**Nota**: Una vez subido, el README mostrará tu proyecto de forma profesional sin exponer el código fuente.

# Configuración de Firewall para Backend Local

## 📋 ¿Cuándo usar esto?

Este script es **opcional** y solo necesario si quieres:
- Desarrollar con el backend corriendo en tu PC local
- Probar la app desde tu celular conectado a la misma red WiFi
- Hacer debugging del backend mientras usas la app

## 🚀 Cómo usar

### **Paso 1: Ejecutar como Administrador**

1. Abre **PowerShell como Administrador**:
   - Presiona `Windows + X`
   - Selecciona "Windows PowerShell (Admin)"

2. Navega al directorio del backend:
   ```powershell
   cd C:\Users\danie\OneDrive\Documentos\ToDo-Fit-App\todo-fit-plus\backend
   ```

3. Ejecuta el script:
   ```powershell
   .\setup-firewall.ps1
   ```

### **Paso 2: Configurar el Frontend**

1. Edita el archivo `.env` en el frontend:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.147:8000
   ```
   *(Reemplaza 192.168.1.147 con tu IP local actual)*

2. Limpia el caché de Expo y reinicia:
   ```powershell
   cd ..\frontend
   npx expo start -c
   ```

### **Paso 3: Verificar**

Abre en el navegador de tu celular:
```
http://192.168.1.147:8000/docs
```

Deberías ver la documentación de la API.

---

## 🌐 Backend Remoto vs Local

### **Backend Remoto (Predeterminado)** ✅
```
EXPO_PUBLIC_BACKEND_URL=https://todofit.preview.emergentagent.com
```

**Ventajas:**
- ✅ No requiere configuración de firewall
- ✅ Funciona desde cualquier red
- ✅ Ya tiene datos seed (ejercicios, logros)
- ✅ Perfecto para pruebas generales

**Desventajas:**
- ❌ No puedes debuggear el backend
- ❌ Depende de conexión a internet

---

### **Backend Local** 🏠
```
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.147:8000
```

**Ventajas:**
- ✅ Puedes debuggear el backend
- ✅ Ver logs en tiempo real
- ✅ Modificar código y ver cambios inmediatos
- ✅ Funciona sin internet (solo WiFi local)

**Desventajas:**
- ❌ Requiere configurar firewall
- ❌ Solo funciona en tu red WiFi
- ❌ Tu PC debe estar encendida

---

## 🔥 Regla de Firewall Creada

```
Nombre: "ToDo Fit Backend - Puerto 8000"
Puerto: 8000
Protocolo: TCP
Dirección: Entrada (Inbound)
Perfiles: Domain, Private
Acción: Permitir
```

---

## 🗑️ Eliminar la Regla (Opcional)

Si quieres eliminar la regla del firewall en el futuro:

```powershell
Remove-NetFirewallRule -DisplayName "ToDo Fit Backend - Puerto 8000"
```

---

## 🔍 Solución de Problemas

### **Error: No se puede conectar desde el celular**

1. **Verifica la IP local actual:**
   ```powershell
   ipconfig
   ```
   Busca "IPv4 Address" en tu adaptador WiFi.

2. **Actualiza el .env con la IP correcta**

3. **Verifica que el backend esté corriendo:**
   ```powershell
   curl http://localhost:8000/docs
   ```

4. **Prueba desde otro navegador en tu PC:**
   ```
   http://192.168.1.147:8000/docs
   ```

5. **Verifica el firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "ToDo Fit Backend - Puerto 8000"
   ```

### **Error: Puerto ya en uso**

Encuentra qué está usando el puerto 8000:
```powershell
netstat -ano | findstr :8000
```

Mata el proceso:
```powershell
taskkill /PID <número_pid> /F
```

---

## 💡 Recomendación

**Para desarrollo normal**: Usa el backend remoto (no requiere este script)

**Para debugging intensivo**: Usa el backend local (ejecuta este script)

---

## 📝 Notas

- El script solo crea la regla de firewall, **no inicia el backend**
- Asegúrate de tener MongoDB corriendo localmente antes de iniciar el backend
- La IP local puede cambiar si te reconectas al WiFi

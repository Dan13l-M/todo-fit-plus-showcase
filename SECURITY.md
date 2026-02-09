# 🔐 Seguridad y Configuración para Producción

## Variables de Entorno Requeridas

### Backend (.env)
```bash
MONGO_URL=mongodb://localhost:27017  # Cambiar en producción
DB_NAME=todoapp_fitness
JWT_SECRET=<generar-secret-fuerte>
HOST=0.0.0.0
PORT=8000
```

### Frontend (.env)
```bash
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.87:8000  # Local
# Para producción: https://tu-api-produccion.com
```

## Generar JWT Secret Seguro

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## MongoDB en Producción

### Opciones Recomendadas:
1. **MongoDB Atlas** (gratis hasta 512MB)
2. **Railway** (con MongoDB addon)
3. **Render** (con MongoDB externo)

## Deploy Backend

### Railway/Render:
```bash
pip freeze > requirements.txt
# Configurar variables de entorno en el dashboard
# Desplegar desde GitHub
```

### Configurar CORS en producción:
- Actualizar `server.py` con tu dominio frontend
- No usar `*` en producción

## Consideraciones de Seguridad

✅ **SIEMPRE:**
- Usar HTTPS en producción
- JWT secrets únicos y fuertes
- MongoDB con autenticación habilitada
- Rate limiting en endpoints
- Validación de inputs

❌ **NUNCA:**
- Commitear archivos .env
- Usar passwords en código
- Exponer errores detallados al cliente
- Permitir CORS `*` en producción

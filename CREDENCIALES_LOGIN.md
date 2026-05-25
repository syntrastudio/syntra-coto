# Credenciales de Acceso - Paseo Coto Tonalá

## 🔐 Credenciales de Administrador

**Email:** `admin@paseocototonala.com`  
**Contraseña:** `Admin123!`

## 📝 Información Importante

### Usuario Administrador
- **ID:** admin001
- **Rol:** super_admin
- **Estado:** active
- **Nombre:** Administrador Principal
- **Teléfono:** 3312345678

### URLs del Sistema

**Frontend (Desarrollo):**
- Local: http://localhost:3000
- Login: http://localhost:3000/login

**Backend API:**
- Producción: https://syntra-coto-api.lcdla-scheduler.workers.dev
- Health Check: https://syntra-coto-api.lcdla-scheduler.workers.dev/api/health

### Endpoints Principales

```bash
# Login
POST https://syntra-coto-api.lcdla-scheduler.workers.dev/api/auth/login
Content-Type: application/json

{
  "email": "admin@paseocototonala.com",
  "password": "Admin123!"
}

# Obtener usuario actual
GET https://syntra-coto-api.lcdla-scheduler.workers.dev/api/auth/me
Authorization: Bearer {token}
```

## 🔧 Configuración Aplicada

### 1. Worker API Desplegado
- ✅ Worker actualizado con el código más reciente
- ✅ Rutas de autenticación funcionando correctamente
- ✅ CORS configurado para localhost:3000

### 2. Base de Datos
- ✅ Tablas creadas en D1 Database
- ✅ Usuario administrador configurado
- ✅ Contraseña hasheada con bcrypt

### 3. Variables de Entorno
- ✅ JWT_SECRET configurado en Cloudflare Workers
- ✅ NEXT_PUBLIC_API_URL configurado en frontend

### 4. Seguridad
- ✅ Contraseñas hasheadas con bcrypt (10 rounds)
- ✅ JWT tokens para autenticación
- ✅ CORS configurado correctamente
- ✅ Middleware de autenticación implementado

## 🚀 Cómo Usar

### Iniciar el Frontend

```bash
cd apps/web
npm run dev
```

Luego visita: http://localhost:3000/login

### Probar la API Directamente

```bash
# Login
curl -X POST https://syntra-coto-api.lcdla-scheduler.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@paseocototonala.com","password":"Admin123!"}'
```

## ⚠️ Notas de Seguridad

1. **Cambiar contraseña en producción:** La contraseña actual es para desarrollo. Debe cambiarse en producción.
2. **JWT_SECRET:** El secret actual debe ser reemplazado por uno más seguro en producción.
3. **HTTPS:** Siempre usar HTTPS en producción.
4. **Rate Limiting:** Considerar implementar rate limiting para prevenir ataques de fuerza bruta.

## 📊 Estado del Sistema

- ✅ API funcionando correctamente
- ✅ Base de datos conectada
- ✅ Autenticación operativa
- ✅ CORS configurado
- ✅ Frontend listo para desarrollo

## 🐛 Problemas Resueltos

1. **Worker desactualizado:** Se desplegó la versión más reciente del código
2. **JWT_SECRET faltante:** Se configuró el secret en Cloudflare Workers
3. **Contraseña inválida:** Se actualizó con un hash bcrypt válido
4. **Credenciales incorrectas:** Se actualizaron en la página de login

## 📞 Soporte

Para problemas o preguntas, revisar:
- Logs del Worker: `wrangler tail` en `apps/api`
- Consola del navegador para errores del frontend
- Network tab para ver las peticiones HTTP

---

**Última actualización:** 2026-05-25  
**Estado:** ✅ Sistema Operativo
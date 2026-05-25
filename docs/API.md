# Documentación de API - Paseo Coto Tonalá

API RESTful para el sistema de administración del fraccionamiento.

## Base URL

- **Desarrollo**: `http://localhost:8787`
- **Producción**: `https://api.paseo-coto-tonala.com`

## Autenticación

La API usa JWT (JSON Web Tokens) para autenticación.

### Obtener Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "usuario@example.com",
      "role": "admin"
    }
  }
}
```

### Usar Token

Incluir el token en el header `Authorization`:

```http
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoints

### Health Check

#### GET /api/health

Verifica el estado de la API.

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Autenticación

### POST /api/auth/login

Iniciar sesión.

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "number",
      "email": "string",
      "role": "string"
    }
  }
}
```

### POST /api/auth/logout

Cerrar sesión.

**Headers:** `Authorization: Bearer {token}`

**Respuesta:**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

### GET /api/auth/me

Obtener usuario actual.

**Headers:** `Authorization: Bearer {token}`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "usuario@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "admin"
  }
}
```

---

## Usuarios

### GET /api/users

Listar usuarios (Admin).

**Headers:** `Authorization: Bearer {token}`

**Query Params:**
- `page` (number): Página (default: 1)
- `pageSize` (number): Tamaño de página (default: 10)
- `role` (string): Filtrar por rol

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "usuario@example.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### GET /api/users/:id

Obtener usuario por ID.

**Headers:** `Authorization: Bearer {token}`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "usuario@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "admin",
    "phone": "1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/users

Crear usuario (Admin).

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "admin|resident|security",
  "phone": "string"
}
```

### PUT /api/users/:id

Actualizar usuario.

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "phone": "string"
}
```

### DELETE /api/users/:id

Eliminar usuario (Admin).

**Headers:** `Authorization: Bearer {token}`

---

## Propiedades

### GET /api/properties

Listar propiedades.

**Headers:** `Authorization: Bearer {token}`

**Query Params:**
- `page` (number)
- `pageSize` (number)
- `status` (string): active|inactive|suspended

### GET /api/properties/:id

Obtener propiedad por ID.

### POST /api/properties

Crear propiedad (Admin).

**Body:**
```json
{
  "number": "string",
  "address": "string",
  "area": "number",
  "monthlyFee": "number"
}
```

---

## Pagos

### GET /api/payments

Listar pagos.

**Query Params:**
- `propertyId` (number)
- `status` (string): pending|paid|overdue|cancelled
- `startDate` (string): YYYY-MM-DD
- `endDate` (string): YYYY-MM-DD

### POST /api/payments

Registrar pago.

**Body:**
```json
{
  "propertyId": "number",
  "amount": "number",
  "paymentMethod": "cash|transfer|card|check",
  "reference": "string"
}
```

---

## Visitantes

### GET /api/visitors

Listar visitantes.

### POST /api/visitors

Registrar visitante.

**Body:**
```json
{
  "propertyId": "number",
  "name": "string",
  "phone": "string",
  "vehiclePlate": "string",
  "expectedDate": "string"
}
```

### PUT /api/visitors/:id/check-in

Registrar entrada de visitante.

### PUT /api/visitors/:id/check-out

Registrar salida de visitante.

---

## Incidentes

### GET /api/incidents

Listar incidentes.

### POST /api/incidents

Reportar incidente.

**Body:**
```json
{
  "title": "string",
  "description": "string",
  "priority": "low|medium|high|urgent",
  "propertyId": "number"
}
```

### PUT /api/incidents/:id

Actualizar incidente.

---

## Reservaciones

### GET /api/reservations

Listar reservaciones de terraza.

### POST /api/reservations

Crear reservación.

**Body:**
```json
{
  "propertyId": "number",
  "date": "string",
  "startTime": "string",
  "endTime": "string",
  "attendees": "number"
}
```

---

## Códigos de Estado

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Formato de Errores

```json
{
  "success": false,
  "error": "Mensaje de error",
  "details": {
    "field": "Detalle específico"
  }
}
```

## Rate Limiting

- **Límite**: 100 requests por minuto por IP
- **Headers de respuesta**:
  - `X-RateLimit-Limit`: Límite total
  - `X-RateLimit-Remaining`: Requests restantes
  - `X-RateLimit-Reset`: Timestamp de reset

## Paginación

Todas las listas soportan paginación:

**Query Params:**
- `page`: Número de página (default: 1)
- `pageSize`: Elementos por página (default: 10, max: 100)

**Respuesta:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Webhooks (Futuro)

Los webhooks permitirán recibir notificaciones de eventos:

- `payment.created`
- `visitor.checked_in`
- `incident.created`
- `reservation.confirmed`

## Versionado

La API usa versionado en la URL:
- `/api/v1/...` - Versión 1 (actual)

## Notas

- Todos los timestamps están en formato ISO 8601 UTC
- Las fechas se envían en formato YYYY-MM-DD
- Los montos están en MXN (pesos mexicanos)
- Los IDs son números enteros positivos

## Ejemplos de Uso

### JavaScript/TypeScript

```typescript
// Login
const response = await fetch('http://localhost:8787/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'password123',
  }),
});

const { data } = await response.json();
const token = data.token;

// Usar token
const users = await fetch('http://localhost:8787/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Listar usuarios
curl http://localhost:8787/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Soporte

Para reportar problemas con la API:
1. Verifica la documentación
2. Revisa los códigos de error
3. Contacta al equipo de desarrollo
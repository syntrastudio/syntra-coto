# Guía de Instalación - Paseo Coto Tonalá

Esta guía te ayudará a configurar el proyecto en tu entorno local.

## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >= 18.0.0 ([Descargar](https://nodejs.org/))
- **pnpm** >= 8.0.0 (se instalará automáticamente si usas el script de setup)
- **Git** ([Descargar](https://git-scm.com/))
- **SQLite3** (para desarrollo local)
- **Cuenta de Cloudflare** (para producción)

## Instalación Rápida

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd Proyecto_Coto
```

### 2. Ejecutar Script de Setup

```bash
./scripts/setup.sh
```

Este script:
- Verifica las dependencias del sistema
- Instala pnpm si no está instalado
- Instala todas las dependencias del proyecto
- Crea el archivo `.env` desde `.env.example`
- Crea la base de datos local

### 3. Configurar Variables de Entorno

Edita el archivo `.env` con tus valores:

```bash
# Base de datos local
DATABASE_URL="file:./database/dev.db"

# API
API_URL="http://localhost:8787"
NEXT_PUBLIC_API_URL="http://localhost:8787"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Autenticación
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui"
JWT_SECRET="tu-jwt-secret-aqui"
```

### 4. Ejecutar Migraciones

```bash
pnpm db:migrate
# o
./scripts/migrate.sh
```

### 5. (Opcional) Cargar Datos de Prueba

```bash
pnpm db:seed
```

### 6. Iniciar Servidor de Desarrollo

```bash
pnpm dev
# o
./scripts/dev.sh
```

El proyecto estará disponible en:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8787

## Instalación Manual

Si prefieres instalar manualmente:

### 1. Instalar pnpm

```bash
npm install -g pnpm@8.15.0
```

### 2. Instalar Dependencias

```bash
pnpm install
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 4. Crear Base de Datos

```bash
touch database/dev.db
```

### 5. Ejecutar Migraciones

```bash
cd database
for file in migrations/*.sql; do
  sqlite3 dev.db < "$file"
done
cd ..
```

### 6. Iniciar Desarrollo

```bash
pnpm dev
```

## Configuración de Cloudflare (Producción)

### 1. Instalar Wrangler CLI

```bash
pnpm add -g wrangler
```

### 2. Autenticarse con Cloudflare

```bash
wrangler login
```

### 3. Crear Base de Datos D1

```bash
wrangler d1 create paseo-coto-tonala
```

Copia el `database_id` generado y actualiza `apps/api/wrangler.toml`.

### 4. Ejecutar Migraciones en D1

```bash
cd apps/api
wrangler d1 migrations apply paseo-coto-tonala
```

### 5. Crear Bucket R2 (Opcional)

```bash
wrangler r2 bucket create paseo-coto-tonala-storage
```

### 6. Configurar Secrets

```bash
cd apps/api
wrangler secret put JWT_SECRET
wrangler secret put NEXTAUTH_SECRET
```

## Verificación de la Instalación

### Verificar Frontend

```bash
curl http://localhost:3000
```

### Verificar Backend API

```bash
curl http://localhost:8787/api/health
```

Deberías recibir:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Solución de Problemas

### Error: "pnpm: command not found"

```bash
npm install -g pnpm@8.15.0
```

### Error: "Cannot find module"

```bash
pnpm install
```

### Error: "Port 3000 already in use"

```bash
# Cambiar puerto en apps/web/package.json
"dev": "next dev -p 3001"
```

### Error de Base de Datos

```bash
# Eliminar y recrear base de datos
rm database/dev.db
./scripts/migrate.sh
```

## Comandos Útiles

```bash
# Desarrollo
pnpm dev              # Iniciar todos los servicios
pnpm dev:web          # Solo frontend
pnpm dev:api          # Solo backend

# Build
pnpm build            # Construir todos los proyectos
pnpm build:web        # Solo frontend
pnpm build:api        # Solo backend

# Linting
pnpm lint             # Ejecutar linter
pnpm lint:fix         # Corregir problemas

# Formateo
pnpm format           # Formatear código
pnpm format:check     # Verificar formato

# Base de datos
pnpm db:migrate       # Ejecutar migraciones
pnpm db:seed          # Cargar datos de prueba
pnpm db:studio        # Abrir Drizzle Studio

# Limpieza
pnpm clean            # Limpiar archivos generados
```

## Próximos Pasos

- Lee la [Guía de Desarrollo](DEVELOPMENT.md)
- Revisa la [Documentación de API](API.md)
- Consulta el [Plan Arquitectónico](../PLAN_ARQUITECTONICO_PASEO_COTO_TONALA.md)

## Soporte

Si encuentras problemas durante la instalación, por favor:
1. Verifica que cumples con todos los prerrequisitos
2. Revisa la sección de solución de problemas
3. Consulta los logs de error
4. Contacta al equipo de desarrollo
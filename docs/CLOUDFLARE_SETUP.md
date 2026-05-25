# Configuración de Cloudflare - Syntra Coto

Este documento contiene toda la información sobre la configuración de infraestructura en Cloudflare para el proyecto Syntra Coto.

## 📋 Información General

- **Cuenta de Cloudflare:** La Casa de los Abuelos
- **Account ID:** `409a158b8e894ec37f2d6e6357fca2d2`
- **Email:** lcdla.scheduler@gmail.com
- **Dominio Principal:** syntrastudio.dev
- **Dominio del Proyecto:** coto.syntrastudio.dev
- **Repositorio:** https://github.com/syntrastudio/syntra-coto

## 🗄️ Recursos Creados

### 1. D1 Database (Base de Datos)

```
Nombre:        syntra-coto-db
Database ID:   7f4d6f52-a406-4ae9-93a4-f5b80c21b8f2
Binding:       DB
Región:        WNAM (Western North America)
Tablas:        17
Propiedades:   130
Estado:        ✅ Activa con datos iniciales
```

**Configuración en wrangler.toml:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "syntra-coto-db"
database_id = "7f4d6f52-a406-4ae9-93a4-f5b80c21b8f2"
```

### 2. R2 Bucket (Almacenamiento de Archivos)

```
Nombre:         syntra-coto-storage
Binding:        STORAGE
Storage Class:  Standard
Estado:         ✅ Activo
```

**Configuración en wrangler.toml:**
```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "syntra-coto-storage"
```

### 3. KV Namespace (Cache)

```
Título:         CACHE
Namespace ID:   4d3fb797cfbf4f5c81f4fe3bebc84279
Binding:        CACHE
Estado:         ✅ Activo
```

**Configuración en wrangler.toml:**
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "4d3fb797cfbf4f5c81f4fe3bebc84279"
```

### 4. Workers (API)

```
Nombre:              syntra-coto-api
Nombre Dev:          syntra-coto-api-dev
URL:                 https://syntra-coto-api.lcdla-scheduler.workers.dev
Version ID:          e1924c8a-a2a0-4461-9529-ebd53793e5d6
Estado:              ✅ Desplegado
```

**Ruta Configurada:**
```
Pattern:    coto.syntrastudio.dev/api/*
Zone:       syntrastudio.dev
```

### 5. Cloudflare Pages (Frontend)

```
Proyecto:            syntra-coto
Framework:           Next.js
Build Command:       pnpm build
Output Directory:    .next
Root Directory:      apps/web
Production Branch:   main
Estado:              ⏳ Pendiente de configuración
```

## 🚀 Comandos Útiles de Wrangler

### Base de Datos D1

```bash
# Listar bases de datos
wrangler d1 list

# Ejecutar query en producción
wrangler d1 execute syntra-coto-db --remote --command="SELECT * FROM users LIMIT 5"

# Ejecutar archivo SQL
wrangler d1 execute syntra-coto-db --remote --file=database/schema.sql

# Backup de la base de datos
wrangler d1 export syntra-coto-db --remote --output=backup.sql

# Ver información de la base de datos
wrangler d1 info syntra-coto-db
```

### R2 Bucket

```bash
# Listar buckets
wrangler r2 bucket list

# Listar objetos en el bucket
wrangler r2 object list syntra-coto-storage

# Subir archivo
wrangler r2 object put syntra-coto-storage/path/to/file.pdf --file=local-file.pdf

# Descargar archivo
wrangler r2 object get syntra-coto-storage/path/to/file.pdf --file=downloaded-file.pdf

# Eliminar archivo
wrangler r2 object delete syntra-coto-storage/path/to/file.pdf
```

### KV Namespace

```bash
# Listar namespaces
wrangler kv namespace list

# Listar keys
wrangler kv key list --namespace-id=4d3fb797cfbf4f5c81f4fe3bebc84279

# Obtener valor
wrangler kv key get "key-name" --namespace-id=4d3fb797cfbf4f5c81f4fe3bebc84279

# Establecer valor
wrangler kv key put "key-name" "value" --namespace-id=4d3fb797cfbf4f5c81f4fe3bebc84279

# Eliminar key
wrangler kv key delete "key-name" --namespace-id=4d3fb797cfbf4f5c81f4fe3bebc84279
```

### Workers

```bash
# Desplegar worker
cd apps/api && wrangler deploy

# Desplegar a ambiente específico
cd apps/api && wrangler deploy --env=production

# Ver logs en tiempo real
wrangler tail syntra-coto-api

# Ver deployments
wrangler deployments list

# Rollback a versión anterior
wrangler rollback [version-id]

# Ver secretos
wrangler secret list

# Agregar secreto
wrangler secret put SECRET_NAME
```

### Pages

```bash
# Listar proyectos
wrangler pages project list

# Crear deployment
wrangler pages deploy apps/web/.next --project-name=syntra-coto

# Ver deployments
wrangler pages deployment list --project-name=syntra-coto

# Ver logs
wrangler pages deployment tail --project-name=syntra-coto
```

## 📝 Guía de Deployment

### 1. Deployment del Worker (API)

```bash
# Desde la raíz del proyecto
cd apps/api

# Desplegar a desarrollo
wrangler deploy --env=development

# Desplegar a producción
wrangler deploy --env=production
```

### 2. Deployment de Pages (Frontend)

**Opción A: Desde CLI**
```bash
# Construir la aplicación
cd apps/web
pnpm build

# Desplegar
wrangler pages deploy .next --project-name=syntra-coto
```

**Opción B: Desde Dashboard (Recomendado)**
1. Ir a Cloudflare Dashboard > Pages
2. Crear nuevo proyecto
3. Conectar con GitHub: syntrastudio/syntra-coto
4. Configurar:
   - Framework: Next.js
   - Build command: `cd apps/web && pnpm build`
   - Build output: `apps/web/.next`
   - Root directory: `/`
   - Node version: 18

### 3. Migraciones de Base de Datos

```bash
# Aplicar nueva migración
wrangler d1 execute syntra-coto-db --remote --file=database/migrations/XXX_migration.sql

# Verificar tablas
wrangler d1 execute syntra-coto-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# Ver datos de una tabla
wrangler d1 execute syntra-coto-db --remote --command="SELECT * FROM properties LIMIT 10"
```

## 🔐 Variables de Entorno y Secretos

### Secretos Requeridos

```bash
# JWT Secret para autenticación
wrangler secret put JWT_SECRET

# Clave de encriptación
wrangler secret put ENCRYPTION_KEY

# API Token de Cloudflare (para MCP)
wrangler secret put CLOUDFLARE_API_TOKEN
```

### Variables de Entorno Opcionales

```bash
# SMTP para emails
wrangler secret put SMTP_HOST
wrangler secret put SMTP_PORT
wrangler secret put SMTP_USER
wrangler secret put SMTP_PASSWORD

# Webhooks
wrangler secret put WEBHOOK_URL
```

## 🌐 Configuración de Dominio Custom

### Para el Worker (API)

El dominio ya está configurado en `wrangler.toml`:
```toml
routes = [
  { pattern = "coto.syntrastudio.dev/api/*", zone_name = "syntrastudio.dev" }
]
```

### Para Pages (Frontend)

1. Ir a Cloudflare Dashboard > Pages > syntra-coto
2. Settings > Custom domains
3. Agregar: `coto.syntrastudio.dev`
4. Cloudflare configurará automáticamente el DNS

### Verificar DNS

```bash
# Verificar que el dominio apunta correctamente
dig coto.syntrastudio.dev

# Verificar SSL
curl -I https://coto.syntrastudio.dev
```

## 🔍 Troubleshooting

### Error: "Database not found"

```bash
# Verificar que la base de datos existe
wrangler d1 list

# Verificar el ID en wrangler.toml
cat apps/api/wrangler.toml | grep database_id
```

### Error: "Binding not found"

```bash
# Verificar bindings en el worker desplegado
wrangler deployments list
wrangler deployments view [deployment-id]
```

### Error: "KV namespace not found"

```bash
# Verificar namespaces
wrangler kv namespace list

# Verificar el ID en wrangler.toml
cat apps/api/wrangler.toml | grep "id ="
```

### Worker no responde

```bash
# Ver logs en tiempo real
wrangler tail syntra-coto-api

# Ver último deployment
wrangler deployments list

# Hacer rollback si es necesario
wrangler rollback [version-id]
```

### Pages build falla

```bash
# Ver logs del build
wrangler pages deployment list --project-name=syntra-coto
wrangler pages deployment tail --project-name=syntra-coto

# Verificar variables de entorno en Dashboard
# Pages > syntra-coto > Settings > Environment variables
```

## 📊 Monitoreo y Logs

### Ver Métricas del Worker

```bash
# Analytics en tiempo real
wrangler tail syntra-coto-api

# Ver en Dashboard
# Workers & Pages > syntra-coto-api > Metrics
```

### Ver Uso de D1

```bash
# Ver información de la base de datos
wrangler d1 info syntra-coto-db

# Dashboard: Storage & Databases > D1 > syntra-coto-db
```

### Ver Uso de R2

```bash
# Ver estadísticas del bucket
wrangler r2 bucket list

# Dashboard: Storage & Databases > R2 > syntra-coto-storage
```

## 🔄 Backup y Recuperación

### Backup de D1

```bash
# Exportar base de datos completa
wrangler d1 export syntra-coto-db --remote --output=backup-$(date +%Y%m%d).sql

# Restaurar desde backup
wrangler d1 execute syntra-coto-db --remote --file=backup-20260525.sql
```

### Backup de R2

```bash
# Listar todos los archivos
wrangler r2 object list syntra-coto-storage > r2-files-$(date +%Y%m%d).txt

# Descargar archivos importantes
wrangler r2 object get syntra-coto-storage/important-file.pdf --file=backup/important-file.pdf
```

## 📚 Recursos Adicionales

- [Documentación de Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Documentación de D1](https://developers.cloudflare.com/d1/)
- [Documentación de R2](https://developers.cloudflare.com/r2/)
- [Documentación de KV](https://developers.cloudflare.com/kv/)
- [Documentación de Pages](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

## 📞 Soporte

Para problemas con la infraestructura de Cloudflare:
1. Revisar esta documentación
2. Consultar los logs con `wrangler tail`
3. Verificar el Dashboard de Cloudflare
4. Contactar al equipo de desarrollo

---

**Última actualización:** 2026-05-25  
**Configurado por:** Bob (AI Assistant)  
**Estado:** ✅ Infraestructura base completada
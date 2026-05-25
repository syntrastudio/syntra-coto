# Syntra Coto - Sistema de Administración de Fraccionamientos

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)

**Syntra Coto** es un producto de [Syntra Flujo](https://syntrastudio.dev) - Sistema integral de administración para fraccionamientos y condominios, desarrollado con tecnologías modernas y escalables.

🌐 **Dominio:** [coto.syntrastudio.dev](https://coto.syntrastudio.dev)  
📦 **Repositorio:** [github.com/syntrastudio/syntra-coto](https://github.com/syntrastudio/syntra-coto)

## 🎯 Sobre el Proyecto

Syntra Coto es una solución completa para la gestión administrativa de fraccionamientos, diseñada específicamente para el Paseo Coto Tonalá. El sistema permite:

- 💰 Gestión de cuotas y pagos mensuales
- 👥 Administración de residentes y propiedades
- 🚗 Control de acceso de visitantes y vehículos
- 🏢 Reservación de áreas comunes (terraza)
- 📄 Gestión documental
- 🔔 Sistema de notificaciones
- 📊 Reportes y auditoría
- 🏛️ Gestión de asambleas

## 🏗️ Arquitectura

Este proyecto utiliza una arquitectura de monorepo con las siguientes tecnologías:

### Frontend
- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **shadcn/ui** - Componentes UI reutilizables

### Backend
- **Hono.js** - Framework web ultrarrápido
- **Cloudflare Workers** - Edge computing
- **Cloudflare D1** - Base de datos SQL serverless
- **Drizzle ORM** - ORM type-safe

### Herramientas
- **pnpm** - Gestor de paquetes eficiente
- **Turborepo** - Sistema de build optimizado
- **ESLint & Prettier** - Linting y formateo de código
- **Docker** - Contenedorización para desarrollo

## 📁 Estructura del Proyecto

```
syntra-coto/
├── apps/
│   ├── web/                    # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/           # App Router de Next.js
│   │   │   ├── components/    # Componentes React
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── lib/           # Utilidades
│   │   │   └── styles/        # Estilos globales
│   │   └── public/            # Archivos estáticos
│   └── api/                    # Backend Cloudflare Workers
│       ├── src/
│       │   ├── routes/        # Rutas de la API
│       │   ├── middleware/    # Middleware
│       │   ├── services/      # Lógica de negocio
│       │   └── types/         # Tipos TypeScript
│       └── wrangler.toml      # Configuración Cloudflare
├── packages/
│   ├── shared/                 # Tipos y utilidades compartidas
│   │   ├── constants/         # Constantes del sistema
│   │   ├── types/             # Tipos compartidos
│   │   ├── utils/             # Funciones utilitarias
│   │   └── validators/        # Validadores Zod
│   └── ui/                     # Componentes UI compartidos
├── database/
│   ├── schema.sql             # Esquema completo de la BD
│   ├── migrations/            # Migraciones SQL
│   └── seeds/                 # Datos iniciales
├── docker/                     # Configuración Docker
│   ├── docker-compose.yml     # Orquestación de servicios
│   └── Dockerfile.dev         # Imagen de desarrollo
├── docs/                       # Documentación
│   ├── SETUP.md               # Guía de instalación
│   ├── DEVELOPMENT.md         # Guía de desarrollo
│   └── API.md                 # Documentación de API
└── scripts/                    # Scripts de utilidad
    ├── setup.sh               # Script de configuración inicial
    ├── dev.sh                 # Script de desarrollo
    └── migrate.sh             # Script de migraciones
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Cuenta de Cloudflare (para producción)
- Docker (opcional, para desarrollo local)

### Instalación

1. **Clonar el repositorio:**
```bash
git clone https://github.com/syntrastudio/syntra-coto.git
cd syntra-coto
```

2. **Instalar dependencias:**
```bash
pnpm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus valores
```

4. **Ejecutar migraciones de base de datos:**
```bash
pnpm db:migrate
```

5. **Sembrar datos iniciales (opcional):**
```bash
pnpm db:seed
```

### Desarrollo

**Opción 1: Desarrollo local con pnpm**
```bash
# Iniciar todos los servicios
pnpm dev

# O iniciar servicios individuales:
pnpm dev:web    # Solo frontend (http://localhost:3000)
pnpm dev:api    # Solo backend (http://localhost:8787)
```

**Opción 2: Desarrollo con Docker**
```bash
# Iniciar todos los servicios con Docker
docker-compose -f docker/docker-compose.yml up

# O usar el script de desarrollo
./scripts/dev.sh
```

## 📝 Scripts Disponibles

### Desarrollo
- `pnpm dev` - Iniciar todos los servicios en desarrollo
- `pnpm dev:web` - Iniciar solo el frontend
- `pnpm dev:api` - Iniciar solo el backend

### Build y Deploy
- `pnpm build` - Construir todos los proyectos
- `pnpm deploy` - Desplegar a producción
- `pnpm deploy:api` - Desplegar solo el backend
- `pnpm deploy:web` - Desplegar solo el frontend

### Calidad de Código
- `pnpm lint` - Ejecutar linter en todos los proyectos
- `pnpm lint:fix` - Corregir problemas de linting automáticamente
- `pnpm format` - Formatear código con Prettier
- `pnpm type-check` - Verificar tipos TypeScript

### Base de Datos
- `pnpm db:generate` - Generar migraciones de Drizzle
- `pnpm db:migrate` - Ejecutar migraciones
- `pnpm db:studio` - Abrir Drizzle Studio
- `pnpm db:seed` - Sembrar datos iniciales
- `pnpm db:reset` - Resetear base de datos

### Testing
- `pnpm test` - Ejecutar todos los tests
- `pnpm test:watch` - Ejecutar tests en modo watch
- `pnpm test:coverage` - Generar reporte de cobertura

## 📚 Documentación

- [📖 Guía de Instalación](docs/SETUP.md) - Configuración detallada del entorno
- [💻 Guía de Desarrollo](docs/DEVELOPMENT.md) - Convenciones y mejores prácticas
- [🔌 Documentación de API](docs/API.md) - Endpoints y ejemplos
- [🏛️ Plan Arquitectónico](PLAN_ARQUITECTONICO_PASEO_COTO_TONALA.md) - Diseño del sistema
- [📋 Reglamento](reglamento.txt) - Reglamento del fraccionamiento

## 🔐 Seguridad

Este proyecto implementa múltiples capas de seguridad:

- 🔑 **Autenticación JWT** - Tokens seguros para sesiones
- 👮 **Autorización basada en roles** - Control de acceso granular
- ✅ **Validación de datos con Zod** - Validación type-safe
- 🛡️ **Protección CSRF** - Prevención de ataques cross-site
- ⏱️ **Rate limiting** - Limitación de peticiones
- 📝 **Auditoría de acciones** - Registro completo de operaciones
- 🔒 **Encriptación de datos sensibles** - Protección de información crítica

## 🎨 Características Principales

### Para Administradores
- Dashboard con métricas en tiempo real
- Gestión completa de residentes y propiedades
- Control de pagos y generación de recibos
- Gestión de morosos y cargos por mora
- Sistema de notificaciones masivas
- Reportes financieros y estadísticos
- Gestión de asambleas y votaciones

### Para Residentes
- Portal de autoservicio
- Consulta de estado de cuenta
- Historial de pagos
- Registro de visitantes
- Reservación de áreas comunes
- Consulta de documentos
- Reporte de incidencias

### Para Vigilancia
- Control de acceso de visitantes
- Registro de vehículos
- Consulta rápida de residentes
- Notificaciones de emergencia

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Por favor lee nuestra [Guía de Contribución](CONTRIBUTING.md) para conocer el proceso.

### Proceso de Contribución

1. Fork el repositorio
2. Crear una rama desde `main` (`git checkout -b feature/nueva-funcionalidad`)
3. Realizar cambios siguiendo las convenciones del proyecto
4. Ejecutar tests y linting (`pnpm test && pnpm lint`)
5. Commit con mensajes descriptivos (seguir [Conventional Commits](https://www.conventionalcommits.org/))
6. Push a tu fork (`git push origin feature/nueva-funcionalidad`)
7. Crear Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Equipo

**Syntra Coto** es desarrollado y mantenido por [Syntra Studio](https://syntrastudio.dev).

### Contacto

- 🌐 Website: [syntrastudio.dev](https://syntrastudio.dev)
- 📧 Email: contacto@syntrastudio.dev
- 💼 LinkedIn: [Syntra Studio](https://linkedin.com/company/syntrastudio)

## 🙏 Agradecimientos

Desarrollado para la administración del fraccionamiento Paseo Coto Tonalá.

---

**Hecho con ❤️ por Syntra Studio**

Para más información, consulta la [documentación completa](docs/).
# Syntra Coto - Frontend

Frontend del sistema de administración del fraccionamiento Paseo Coto Tonalá, construido con Next.js 14.

## 🚀 Tecnologías

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utility-first
- **TanStack Query** - Manejo de estado del servidor
- **React Hook Form** - Manejo de formularios
- **Zod** - Validación de esquemas
- **Lucide React** - Iconos
- **Sonner** - Notificaciones toast
- **date-fns** - Manejo de fechas

## 📋 Requisitos Previos

- Node.js 18+ 
- pnpm 8+

## 🛠️ Instalación

1. Instalar dependencias:
```bash
pnpm install
```

2. Configurar variables de entorno:
```bash
cp .env.local.example .env.local
```

Editar `.env.local` con la URL de tu API:
```
NEXT_PUBLIC_API_URL=https://syntra-coto-api.lcdla-scheduler.workers.dev
```

## 🏃 Desarrollo

Iniciar el servidor de desarrollo:
```bash
pnpm dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## 🔐 Credenciales de Prueba

Para acceder al sistema, usa las siguientes credenciales:

- **Email:** admin@coto.com
- **Password:** password123

## 📁 Estructura del Proyecto

```
apps/web/
├── src/
│   ├── app/                    # App Router de Next.js
│   │   ├── (dashboard)/       # Rutas protegidas del dashboard
│   │   │   ├── dashboard/     # Página principal del dashboard
│   │   │   │   ├── properties/  # Gestión de propiedades
│   │   │   │   ├── residents/   # Gestión de residentes
│   │   │   │   ├── fees/        # Gestión de cuotas
│   │   │   │   └── payments/    # Gestión de pagos
│   │   │   └── layout.tsx     # Layout con sidebar
│   │   ├── login/             # Página de login
│   │   └── layout.tsx         # Layout raíz
│   ├── components/            # Componentes reutilizables
│   │   ├── ProtectedRoute.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   └── PropertyCard.tsx
│   ├── lib/                   # Utilidades y configuración
│   │   ├── api-client.ts      # Cliente HTTP para la API
│   │   ├── auth-context.tsx   # Context de autenticación
│   │   └── utils.ts
│   ├── types/                 # Definiciones de tipos TypeScript
│   │   └── index.ts
│   └── styles/               # Estilos globales
│       └── globals.css
├── public/                   # Archivos estáticos
├── .env.local               # Variables de entorno (no commitear)
├── .env.local.example       # Ejemplo de variables de entorno
├── next.config.js           # Configuración de Next.js
├── tailwind.config.ts       # Configuración de Tailwind
└── tsconfig.json           # Configuración de TypeScript
```

## 🎨 Características Implementadas

### Autenticación
- ✅ Login con email y password
- ✅ Protección de rutas
- ✅ Manejo de sesión con JWT
- ✅ Logout

### Dashboard
- ✅ Estadísticas generales
- ✅ Total de propiedades
- ✅ Propiedades ocupadas/vacías
- ✅ Cuotas pendientes
- ✅ Pagos del mes
- ✅ Actividad reciente

### Propiedades
- ✅ Lista de propiedades con paginación
- ✅ Filtros por estado y calle
- ✅ Búsqueda por número de casa
- ✅ Vista detallada de propiedad
- ✅ Información de residentes
- ✅ Historial de cuotas y pagos

### Residentes
- ✅ Lista de residentes con paginación
- ✅ Búsqueda por nombre
- ✅ Información de contacto
- ✅ Propiedad asociada

### Cuotas
- ✅ Lista de cuotas mensuales
- ✅ Filtros por estado
- ✅ Indicadores de morosidad
- ✅ Vista tabular con detalles

### Pagos
- ✅ Historial de pagos
- ✅ Filtros por método de pago
- ✅ Vista tabular con detalles
- ✅ Información de referencia

## 🎯 Próximos Pasos

- [ ] Implementar formularios de creación/edición
- [ ] Agregar gráficos con Recharts
- [ ] Implementar exportación a PDF/Excel
- [ ] Agregar modo oscuro
- [ ] Implementar notificaciones en tiempo real
- [ ] Agregar más filtros avanzados
- [ ] Implementar búsqueda global
- [ ] Agregar gestión de documentos
- [ ] Implementar calendario de eventos

## 🏗️ Build para Producción

```bash
pnpm build
```

## 🚀 Despliegue

El proyecto está configurado para desplegarse en Vercel:

```bash
vercel
```

## 📝 Notas

- Los errores de TypeScript en el editor se resolverán al reiniciar el servidor de desarrollo
- La API debe estar corriendo y accesible para que el frontend funcione correctamente
- Las rutas están protegidas y redirigen a `/login` si no hay sesión activa

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

---

Desarrollado con ❤️ para Paseo Coto Tonalá
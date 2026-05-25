# Guía de Desarrollo - Paseo Coto Tonalá

Esta guía proporciona información para desarrolladores que trabajarán en el proyecto.

## Estructura del Proyecto

```
/
├── apps/
│   ├── web/                    # Frontend Next.js 14
│   │   ├── src/
│   │   │   ├── app/           # App Router
│   │   │   ├── components/    # Componentes React
│   │   │   ├── lib/          # Utilidades
│   │   │   ├── hooks/        # Custom hooks
│   │   │   └── styles/       # Estilos globales
│   │   └── public/           # Assets estáticos
│   │
│   └── api/                   # Backend Cloudflare Workers
│       └── src/
│           ├── routes/       # Rutas de la API
│           ├── middleware/   # Middlewares
│           ├── services/     # Lógica de negocio
│           ├── utils/        # Utilidades
│           └── types/        # Tipos TypeScript
│
├── packages/
│   ├── database/             # Esquema DB y migraciones
│   ├── shared/               # Código compartido
│   │   ├── types/           # Tipos compartidos
│   │   ├── constants/       # Constantes
│   │   ├── utils/           # Utilidades
│   │   └── validators/      # Validadores Zod
│   │
│   └── ui/                   # Componentes UI compartidos
│       └── src/
│           ├── components/  # Componentes shadcn/ui
│           └── lib/         # Utilidades UI
│
├── docker/                   # Configuración Docker
├── docs/                     # Documentación
└── scripts/                  # Scripts de utilidad
```

## Stack Tecnológico

### Frontend
- **Next.js 14**: Framework React con App Router
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Framework CSS utilitario
- **shadcn/ui**: Componentes UI accesibles
- **React Query**: Gestión de estado del servidor
- **React Hook Form**: Manejo de formularios
- **Zod**: Validación de esquemas

### Backend
- **Hono.js**: Framework web minimalista
- **Cloudflare Workers**: Plataforma serverless
- **Cloudflare D1**: Base de datos SQL
- **Drizzle ORM**: ORM type-safe
- **Zod**: Validación de datos
- **Jose**: Manejo de JWT

### Herramientas
- **pnpm**: Gestor de paquetes
- **Turborepo**: Sistema de build
- **ESLint**: Linter
- **Prettier**: Formateador de código

## Convenciones de Código

### TypeScript

```typescript
// ✅ Usar tipos explícitos
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Evitar any
function process(data: any) { // Mal
  // ...
}

// ✅ Usar interfaces para objetos
interface User {
  id: number;
  email: string;
  role: UserRole;
}

// ✅ Usar enums para constantes relacionadas
enum UserRole {
  ADMIN = 'admin',
  RESIDENT = 'resident',
}
```

### Nombres de Archivos

- **Componentes React**: PascalCase (`UserProfile.tsx`)
- **Utilidades**: camelCase (`formatDate.ts`)
- **Tipos**: PascalCase (`User.ts`)
- **Constantes**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

### Componentes React

```typescript
// ✅ Usar function components con TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn('btn', `btn-${variant}`)}>
      {label}
    </button>
  );
}

// ✅ Exportar tipos junto con componentes
export type { ButtonProps };
```

### Hooks Personalizados

```typescript
// ✅ Prefijo 'use' para hooks
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  
  // ...
  
  return { user, login, logout };
}
```

### API Routes (Backend)

```typescript
// ✅ Estructura clara de rutas
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();

app.get('/users', async (c) => {
  // Lógica
});

app.post('/users', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');
  // Lógica
});

export default app;
```

## Flujo de Trabajo

### 1. Crear Nueva Funcionalidad

```bash
# Crear rama desde main
git checkout -b feature/nombre-funcionalidad

# Hacer cambios
# ...

# Commit con mensaje descriptivo
git commit -m "feat: agregar funcionalidad X"

# Push y crear PR
git push origin feature/nombre-funcionalidad
```

### 2. Convenciones de Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan código)
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

Ejemplos:
```bash
git commit -m "feat: agregar módulo de pagos"
git commit -m "fix: corregir cálculo de recargos"
git commit -m "docs: actualizar guía de instalación"
```

### 3. Code Review

Antes de hacer merge:
- ✅ Código pasa linting (`pnpm lint`)
- ✅ Código está formateado (`pnpm format`)
- ✅ Types son correctos (`pnpm type-check`)
- ✅ Tests pasan (cuando se implementen)
- ✅ Documentación actualizada

## Desarrollo de Funcionalidades

### Agregar Nueva Ruta en Frontend

1. Crear página en `apps/web/src/app/`:
```typescript
// apps/web/src/app/propiedades/page.tsx
export default function PropertiesPage() {
  return <div>Propiedades</div>;
}
```

2. Crear componentes necesarios en `apps/web/src/components/`

3. Agregar tipos en `packages/shared/src/types/`

### Agregar Nueva Ruta en Backend

1. Crear archivo de ruta en `apps/api/src/routes/`:
```typescript
// apps/api/src/routes/properties.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/', async (c) => {
  // Lógica
  return c.json({ properties: [] });
});

export default app;
```

2. Montar ruta en `apps/api/src/index.ts`:
```typescript
import propertyRoutes from './routes/properties';

app.route('/api/properties', propertyRoutes);
```

### Agregar Validador

1. Crear schema en `packages/shared/src/validators/`:
```typescript
import { z } from 'zod';

export const createPropertySchema = z.object({
  number: z.string(),
  address: z.string(),
  // ...
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
```

2. Usar en backend:
```typescript
import { zValidator } from '@hono/zod-validator';
import { createPropertySchema } from 'shared';

app.post('/', zValidator('json', createPropertySchema), async (c) => {
  const data = c.req.valid('json');
  // ...
});
```

## Testing

### Frontend (cuando se implemente)

```typescript
// apps/web/src/components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Backend (cuando se implemente)

```typescript
// apps/api/src/routes/__tests__/properties.test.ts
import app from '../properties';

describe('Properties API', () => {
  it('GET /properties returns list', async () => {
    const res = await app.request('/properties');
    expect(res.status).toBe(200);
  });
});
```

## Debugging

### Frontend

```typescript
// Usar React DevTools
// Agregar breakpoints en Chrome DevTools

// Logging
console.log('Debug:', data);
```

### Backend

```typescript
// Usar Wrangler logs
// wrangler tail

// Logging
console.log('API Debug:', data);
```

## Performance

### Frontend
- Usar `React.memo` para componentes pesados
- Implementar lazy loading con `next/dynamic`
- Optimizar imágenes con `next/image`
- Usar Server Components cuando sea posible

### Backend
- Implementar caché con KV
- Optimizar queries de base de datos
- Usar índices en tablas frecuentes

## Seguridad

- ✅ Validar TODAS las entradas con Zod
- ✅ Sanitizar datos antes de guardar
- ✅ Usar prepared statements (Drizzle lo hace automáticamente)
- ✅ Implementar rate limiting
- ✅ Nunca exponer secrets en el código
- ✅ Usar HTTPS en producción

## Recursos Útiles

- [Next.js Docs](https://nextjs.org/docs)
- [Hono.js Docs](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [shadcn/ui Docs](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## Soporte

Para preguntas o problemas:
1. Revisa la documentación
2. Busca en issues existentes
3. Contacta al equipo de desarrollo
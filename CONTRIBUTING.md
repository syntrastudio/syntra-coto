# Guía de Contribución - Syntra Coto

¡Gracias por tu interés en contribuir a Syntra Coto! Este documento proporciona las pautas y mejores prácticas para contribuir al proyecto.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo Puedo Contribuir?](#cómo-puedo-contribuir)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Convenciones de Código](#convenciones-de-código)
- [Convenciones de Commits](#convenciones-de-commits)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)

## 📜 Código de Conducta

Este proyecto y todos los participantes están regidos por nuestro Código de Conducta. Al participar, se espera que mantengas este código. Por favor reporta comportamientos inaceptables a contacto@syntrastudio.dev.

## 🤝 ¿Cómo Puedo Contribuir?

### Reportar Bugs

Los bugs se rastrean como issues de GitHub. Antes de crear un issue:

1. **Verifica** que el bug no haya sido reportado previamente
2. **Determina** en qué repositorio debe ir el issue
3. **Recopila** información sobre el bug:
   - Usa un título claro y descriptivo
   - Describe los pasos exactos para reproducir el problema
   - Proporciona ejemplos específicos
   - Describe el comportamiento observado vs. el esperado
   - Incluye capturas de pantalla si es posible
   - Incluye detalles del entorno (OS, navegador, versión de Node.js, etc.)

### Sugerir Mejoras

Las sugerencias de mejoras también se rastrean como issues de GitHub. Al crear una sugerencia:

1. **Usa un título claro y descriptivo**
2. **Proporciona una descripción detallada** de la mejora sugerida
3. **Explica por qué** esta mejora sería útil
4. **Lista algunos ejemplos** de cómo funcionaría la mejora
5. **Especifica** si estás dispuesto a trabajar en la implementación

### Tu Primera Contribución de Código

¿No estás seguro por dónde empezar? Puedes comenzar buscando issues etiquetados como:

- `good first issue` - Issues que deberían requerir solo unas pocas líneas de código
- `help wanted` - Issues que pueden ser más complejos

## 🔄 Proceso de Desarrollo

### 1. Fork y Clone

```bash
# Fork el repositorio en GitHub
# Luego clona tu fork
git clone https://github.com/TU_USUARIO/syntra-coto.git
cd syntra-coto

# Agrega el repositorio original como upstream
git remote add upstream https://github.com/syntrastudio/syntra-coto.git
```

### 2. Crear una Rama

```bash
# Actualiza tu rama main
git checkout main
git pull upstream main

# Crea una nueva rama para tu feature/fix
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/nombre-del-bug
```

### 3. Configurar el Entorno

```bash
# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.example .env

# Ejecutar migraciones
pnpm db:migrate

# Iniciar en modo desarrollo
pnpm dev
```

### 4. Hacer Cambios

- Escribe código limpio y mantenible
- Sigue las convenciones de código del proyecto
- Agrega tests para nuevas funcionalidades
- Actualiza la documentación según sea necesario
- Asegúrate de que todos los tests pasen

### 5. Commit

```bash
# Agregar cambios
git add .

# Commit con mensaje descriptivo (ver convenciones abajo)
git commit -m "feat: agregar nueva funcionalidad"
```

### 6. Push y Pull Request

```bash
# Push a tu fork
git push origin feature/nombre-descriptivo

# Crea un Pull Request en GitHub
```

## 💻 Convenciones de Código

### TypeScript

- Usa TypeScript para todo el código nuevo
- Define tipos explícitos, evita `any`
- Usa interfaces para objetos y types para uniones/intersecciones
- Documenta funciones complejas con JSDoc

```typescript
/**
 * Calcula el total de pagos con recargos por mora
 * @param payments - Array de pagos a procesar
 * @param lateFeeRate - Tasa de recargo por mora (default: 0.1)
 * @returns Total calculado incluyendo recargos
 */
function calculateTotalWithLateFees(
  payments: Payment[],
  lateFeeRate: number = 0.1
): number {
  // implementación
}
```

### React/Next.js

- Usa componentes funcionales con hooks
- Prefiere composición sobre herencia
- Mantén componentes pequeños y enfocados
- Usa TypeScript para props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  children 
}: ButtonProps) {
  // implementación
}
```

### Estilos

- Usa Tailwind CSS para estilos
- Sigue el sistema de diseño establecido
- Usa las clases de utilidad de shadcn/ui
- Evita estilos inline cuando sea posible

### Nombres

- **Archivos**: kebab-case (`user-profile.tsx`)
- **Componentes**: PascalCase (`UserProfile`)
- **Funciones**: camelCase (`getUserProfile`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces/Types**: PascalCase (`UserProfile`)

## 📝 Convenciones de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/) para mensajes de commit claros y consistentes.

### Formato

```
<tipo>[ámbito opcional]: <descripción>

[cuerpo opcional]

[footer(s) opcional(es)]
```

### Tipos

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan el código)
- `refactor`: Refactorización de código
- `perf`: Mejoras de rendimiento
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento
- `ci`: Cambios en CI/CD
- `build`: Cambios en el sistema de build

### Ejemplos

```bash
# Feature
git commit -m "feat(auth): agregar autenticación con JWT"

# Bug fix
git commit -m "fix(payments): corregir cálculo de recargos por mora"

# Documentation
git commit -m "docs(api): actualizar documentación de endpoints"

# Refactor
git commit -m "refactor(database): optimizar queries de residentes"

# Breaking change
git commit -m "feat(api)!: cambiar estructura de respuesta de pagos

BREAKING CHANGE: La respuesta ahora incluye un objeto 'data' wrapper"
```

### Reglas

- Usa el imperativo ("agregar" no "agregado" ni "agrega")
- No capitalices la primera letra
- No uses punto al final
- Mantén la primera línea bajo 72 caracteres
- Usa el cuerpo para explicar el "qué" y "por qué", no el "cómo"

## 🔍 Proceso de Pull Request

### Antes de Crear el PR

1. ✅ Asegúrate de que tu código compile sin errores
2. ✅ Ejecuta todos los tests: `pnpm test`
3. ✅ Ejecuta el linter: `pnpm lint`
4. ✅ Formatea el código: `pnpm format`
5. ✅ Verifica los tipos: `pnpm type-check`
6. ✅ Actualiza la documentación si es necesario
7. ✅ Actualiza o agrega tests según corresponda

### Crear el Pull Request

1. **Título claro**: Usa el formato de Conventional Commits
2. **Descripción detallada**: Explica qué cambios hiciste y por qué
3. **Referencias**: Menciona issues relacionados (#123)
4. **Screenshots**: Incluye capturas si hay cambios visuales
5. **Checklist**: Completa la checklist del template

### Template de PR

```markdown
## Descripción
Breve descripción de los cambios realizados.

## Tipo de Cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva funcionalidad (cambio que agrega funcionalidad)
- [ ] Breaking change (fix o feature que causa que funcionalidad existente no funcione como se esperaba)
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas que realizaste.

## Checklist
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado mi código, especialmente en áreas difíciles
- [ ] He actualizado la documentación correspondiente
- [ ] Mis cambios no generan nuevas advertencias
- [ ] He agregado tests que prueban que mi fix es efectivo o que mi feature funciona
- [ ] Tests unitarios nuevos y existentes pasan localmente
- [ ] Cualquier cambio dependiente ha sido mergeado y publicado

## Screenshots (si aplica)
Agrega screenshots para ayudar a explicar tus cambios.

## Issues Relacionados
Fixes #(issue)
```

### Proceso de Revisión

1. Al menos un maintainer debe aprobar el PR
2. Todos los checks de CI/CD deben pasar
3. Los comentarios de revisión deben ser resueltos
4. El código debe estar actualizado con la rama main

### Después del Merge

1. Elimina tu rama feature
2. Actualiza tu fork
3. Celebra tu contribución 🎉

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
pnpm test

# Tests en modo watch
pnpm test:watch

# Tests con cobertura
pnpm test:coverage

# Tests de un paquete específico
pnpm test --filter @syntra-coto/shared
```

### Escribir Tests

- Escribe tests para toda nueva funcionalidad
- Mantén los tests simples y enfocados
- Usa nombres descriptivos para los tests
- Sigue el patrón AAA (Arrange, Act, Assert)

```typescript
describe('calculateLateFee', () => {
  it('should calculate 10% late fee for overdue payment', () => {
    // Arrange
    const payment = { amount: 1000, dueDate: '2024-01-01' };
    const currentDate = '2024-02-01';
    
    // Act
    const result = calculateLateFee(payment, currentDate);
    
    // Assert
    expect(result).toBe(100);
  });
});
```

## 📚 Recursos Adicionales

- [Documentación del Proyecto](docs/)
- [Plan Arquitectónico](PLAN_ARQUITECTONICO_PASEO_COTO_TONALA.md)
- [Guía de Desarrollo](docs/DEVELOPMENT.md)
- [Documentación de API](docs/API.md)

## 💬 ¿Preguntas?

Si tienes preguntas sobre cómo contribuir, no dudes en:

- Abrir un issue con la etiqueta `question`
- Contactarnos en contacto@syntrastudio.dev
- Revisar la documentación existente

## 🙏 Agradecimientos

¡Gracias por contribuir a Syntra Coto! Tu ayuda hace que este proyecto sea mejor para todos.

---

**Hecho con ❤️ por Syntra Studio**
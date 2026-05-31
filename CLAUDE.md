# Syntra Coto - Contexto del proyecto

## Stack
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Backend: Hono.js en Cloudflare Workers
- DB: Cloudflare D1 (SQLite)
- Storage: R2, Cache: KV
- Monorepo con pnpm + Turborepo

## Contexto de negocio
- Sistema para administrar fraccionamiento Paseo Coto Tonalá
- Mesa directiva NO está constituida como A.C.
- Tesorero recibe en cuenta personal bajo RESICO (transitorio)
- Diseño debe permitir migrar a A.C. sin refactor: el RFC beneficiario
  es configurable, no hardcoded
- Gateway de pago: Mercado Pago (residentes ya lo usan)

## Convenciones
- Sin comentarios "Made with X" en código
- SQL crudo con D1 prepared statements (no Drizzle aún, a pesar del README)
- Validación con Zod en routes
- Servicios en `apps/api/src/services/`, rutas en `routes/`

## Trabajo pendiente prioritario
1. Seguridad: rotar credenciales filtradas (en proceso)
2. Tabla payment_intents para flujo de cobro online
3. Webhook MP con verificación de firma + idempotencia
4. Endpoint POST /api/payments/checkout para crear preference de MP
5. Race condition en updateFeeAfterPayment (UPDATE atómico con CASE)

## Cosas a NO hacer
- No usar localStorage para datos sensibles (no funciona en CF Workers de todos modos)
- No insertar pagos sin verificar idempotencia por gateway_transaction_id
- No leer-validar-escribir el balance de monthly_fees sin atomicidad
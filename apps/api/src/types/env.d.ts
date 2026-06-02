/**
 * Tipos para variables de entorno de Cloudflare Workers
 */

export interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Storage para documentos y archivos
  STORAGE: R2Bucket;
  
  // KV Namespace para caché
  CACHE: KVNamespace;
  
  // Variables de entorno
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  
  // Configuración de la aplicación
  FRONTEND_URL: string;
  API_URL: string;
  
  // Configuración de pagos (opcional)
  // NOTA: MERCADOPAGO_ACCESS_TOKEN era el modelo viejo (token global por secreto).
  // Ahora las credenciales viven CIFRADAS en la tabla payment_gateway_config y se
  // cambian por la app con firma múltiple de la mesa. Se conserva como respaldo.
  STRIPE_SECRET_KEY?: string;
  MERCADOPAGO_ACCESS_TOKEN?: string;

  // Configuración de notificaciones (opcional)
  SENDGRID_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;

  // Correo (Resend) — usados por utils/email.ts
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  APP_URL?: string;
}

// Extender el tipo Context de Hono con nuestros bindings
declare module 'hono' {
  interface ContextVariableMap {
    user?: {
      id: string;
      email: string;
      role: 'super_admin' | 'admin' | 'supervisor' | 'resident';
      full_name: string;
    };
  }
}

// Made with Bob

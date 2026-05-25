// Constantes de la aplicación

// Paginación
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Validaciones
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;
export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 255;
export const MAX_PHONE_LENGTH = 20;
export const MAX_ADDRESS_LENGTH = 500;
export const MAX_DESCRIPTION_LENGTH = 1000;

// Formatos de fecha
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';
export const DISPLAY_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

// Configuración de cuotas
export const MONTHLY_FEE_AMOUNT = 500; // Monto base de cuota mensual en MXN
export const LATE_FEE_PERCENTAGE = 0.05; // 5% de recargo por mora
export const PAYMENT_DUE_DAY = 10; // Día de vencimiento de pago

// Límites de archivos
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Configuración de reservaciones
export const MAX_RESERVATION_DAYS_ADVANCE = 30; // Días máximos de anticipación
export const MIN_RESERVATION_HOURS = 2; // Horas mínimas de reservación
export const MAX_RESERVATION_HOURS = 8; // Horas máximas de reservación

// Configuración de visitantes
export const MAX_VISITORS_PER_PROPERTY = 10; // Visitantes simultáneos por propiedad
export const VISITOR_PASS_VALIDITY_HOURS = 24; // Validez del pase de visitante

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'Acceso denegado',
  NOT_FOUND: 'Recurso no encontrado',
  VALIDATION_ERROR: 'Error de validación',
  INTERNAL_ERROR: 'Error interno del servidor',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  EMAIL_ALREADY_EXISTS: 'El correo electrónico ya está registrado',
  PROPERTY_NOT_FOUND: 'Propiedad no encontrada',
  PAYMENT_ALREADY_PAID: 'El pago ya ha sido registrado',
  INSUFFICIENT_PERMISSIONS: 'Permisos insuficientes',
} as const;

// Mensajes de éxito comunes
export const SUCCESS_MESSAGES = {
  CREATED: 'Creado exitosamente',
  UPDATED: 'Actualizado exitosamente',
  DELETED: 'Eliminado exitosamente',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Cierre de sesión exitoso',
  PASSWORD_CHANGED: 'Contraseña cambiada exitosamente',
  EMAIL_SENT: 'Correo enviado exitosamente',
} as const;

// Regex patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\d{10}$/,
  POSTAL_CODE: /^\d{5}$/,
  RFC: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
  CURP: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/,
} as const;

// Made with Bob

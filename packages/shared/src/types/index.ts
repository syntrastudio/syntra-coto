// Roles de usuario
export enum UserRole {
  ADMIN = 'admin',
  RESIDENT = 'resident',
  SECURITY = 'security',
}

// Estados de propiedades
export enum PropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// Estados de pagos
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

// Métodos de pago
export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer',
  CARD = 'card',
  CHECK = 'check',
}

// Estados de visitantes
export enum VisitorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
}

// Estados de incidentes
export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

// Prioridades de incidentes
export enum IncidentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Estados de reservaciones
export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

// Tipos de notificaciones
export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

// Tipos de documentos
export enum DocumentType {
  REGULATION = 'regulation',
  ASSEMBLY_MINUTES = 'assembly_minutes',
  FINANCIAL_REPORT = 'financial_report',
  ANNOUNCEMENT = 'announcement',
  OTHER = 'other',
}

// Tipo base para respuestas paginadas
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Tipo base para respuestas de API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Made with Bob

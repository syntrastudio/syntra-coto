// Tipos para Cloudflare Workers Bindings
export type Bindings = {
  DB: D1Database;
  STORAGE?: R2Bucket;
  CACHE?: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: string;
};

// Tipos para variables de entorno
export type Env = {
  Bindings: Bindings;
};

// Tipos para respuestas de API
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

// Tipos para autenticación
export type JWTPayload = {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

export type AuthUser = {
  id: number;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
};

// Made with Bob

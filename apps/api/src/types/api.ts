/**
 * Tipos para requests y responses de la API
 */

import type { UserRole, UserStatus, PropertyStatus, MonthlyFeeStatus, PaymentMethod, PaymentStatus } from './database';

// ============================================================================
// RESPUESTAS ESTÁNDAR
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// AUTH
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    status: UserStatus;
  };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  property_id?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface MeResponse {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  phone_verified: boolean;
  profile_image_url: string | null;
  last_login_at: number | null;
  created_at: number;
}

// ============================================================================
// PROPERTIES
// ============================================================================

export interface PropertyListQuery {
  page?: number;
  limit?: number;
  status?: PropertyStatus;
  search?: string;
  sort_by?: 'house_number' | 'street' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PropertyResponse {
  id: string;
  house_number: string;
  street: string;
  status: PropertyStatus;
  owner_id: string | null;
  current_resident_id: string | null;
  gate_control_1: string | null;
  gate_control_2: string | null;
  gate_control_3: string | null;
  owner?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  current_resident?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  created_at: number;
  updated_at: number;
}

export interface PropertyCreateRequest {
  house_number: string;
  street: string;
  status?: PropertyStatus;
  owner_id?: string;
  current_resident_id?: string;
  gate_control_1?: string;
  gate_control_2?: string;
  gate_control_3?: string;
}

export interface PropertyUpdateRequest {
  house_number?: string;
  street?: string;
  status?: PropertyStatus;
  owner_id?: string;
  current_resident_id?: string;
  gate_control_1?: string;
  gate_control_2?: string;
  gate_control_3?: string;
}

// ============================================================================
// RESIDENTS
// ============================================================================

export interface ResidentListQuery {
  page?: number;
  limit?: number;
  type?: 'propietario' | 'inquilino';
  status?: 'activo' | 'inactivo';
  search?: string;
  sort_by?: 'full_name' | 'email' | 'start_date' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface ResidentResponse {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  type: 'propietario' | 'inquilino';
  start_date: number;
  status: 'activo' | 'inactivo';
  created_at: number;
  updated_at: number;
  properties?: Array<{
    id: string;
    house_number: string;
    street: string;
    role: 'propietario' | 'residente_actual';
    start_date: number;
    end_date: number | null;
  }>;
}

export interface ResidentCreateRequest {
  full_name: string;
  phone: string;
  email: string;
  type: 'propietario' | 'inquilino';
  start_date: number;
  status?: 'activo' | 'inactivo';
  property_ids?: string[]; // IDs de propiedades a asociar
}

export interface ResidentUpdateRequest {
  full_name?: string;
  phone?: string;
  email?: string;
  type?: 'propietario' | 'inquilino';
  start_date?: number;
  status?: 'activo' | 'inactivo';
}

// ============================================================================
// MONTHLY FEES
// ============================================================================

export interface MonthlyFeeListQuery {
  page?: number;
  limit?: number;
  property_id?: string;
  status?: MonthlyFeeStatus;
  payment_period?: string;
  from_date?: number;
  to_date?: number;
}

export interface MonthlyFeeResponse {
  id: string;
  property: {
    id: string;
    house_number: string;
    street: string;
  };
  amount: number;
  discount_amount: number;
  discount_percentage: number;
  discount_applied_date: number | null;
  total_amount: number;
  due_date: number;
  payment_period: string;
  status: MonthlyFeeStatus;
  paid_amount: number;
  balance: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface GenerateFeesRequest {
  payment_period: string; // Formato: YYYY-MM
  base_amount: number;
  discount_percentage?: number; // Default: 10
  discount_days?: number; // Default: 16 (días 1-16)
}

export interface GenerateFeesResponse {
  generated: number;
  skipped: number;
  errors: string[];
  fees: MonthlyFeeResponse[];
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface PaymentListQuery {
  page?: number;
  limit?: number;
  property_id?: string;
  monthly_fee_id?: string;
  status?: PaymentStatus;
  payment_method?: PaymentMethod;
  from_date?: number;
  to_date?: number;
}

export interface PaymentResponse {
  id: string;
  monthly_fee: {
    id: string;
    payment_period: string;
    amount: number;
  };
  property: {
    id: string;
    house_number: string;
    street: string;
  };
  amount: number;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  payment_date: number;
  status: PaymentStatus;
  gateway_transaction_id: string | null;
  notes: string | null;
  created_by: {
    id: string;
    full_name: string;
  } | null;
  created_at: number;
}

export interface PaymentCreateRequest {
  monthly_fee_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  payment_date: number;
  notes?: string;
}

export interface PaymentUpdateRequest {
  status?: PaymentStatus;
  gateway_transaction_id?: string;
  notes?: string;
}

// ============================================================================
// DASHBOARD & STATISTICS
// ============================================================================

export interface DashboardStats {
  total_properties: number;
  occupied_properties: number;
  vacant_properties: number;
  total_residents: number;
  current_month_fees: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    collection_rate: number;
  };
  recent_payments: PaymentResponse[];
}

// ============================================================================
// PAGINATION
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Made with Bob

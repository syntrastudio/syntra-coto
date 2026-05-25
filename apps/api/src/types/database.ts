/**
 * Tipos para las tablas de la base de datos D1
 */

// ============================================================================
// USERS
// ============================================================================
export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  role: 'super_admin' | 'admin' | 'supervisor' | 'resident';
  status: 'active' | 'inactive' | 'suspended';
  email_verified: number;
  phone_verified: number;
  profile_image_url: string | null;
  created_by: string | null;
  last_login_at: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type UserRole = User['role'];
export type UserStatus = User['status'];

export interface UserCreateInput {
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
}

export interface UserUpdateInput {
  email?: string;
  full_name?: string;
  phone?: string;
  status?: UserStatus;
  profile_image_url?: string;
}

// ============================================================================
// PROPERTIES
// ============================================================================
export interface Property {
  id: string;
  house_number: string;
  street: string;
  status: 'ocupada' | 'desocupada' | 'en_renta' | 'en_venta';
  owner_id: string | null;
  current_resident_id: string | null;
  gate_control_1: string | null;
  gate_control_2: string | null;
  gate_control_3: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type PropertyStatus = Property['status'];

export interface PropertyCreateInput {
  house_number: string;
  street: string;
  status?: PropertyStatus;
  owner_id?: string;
  current_resident_id?: string;
  gate_control_1?: string;
  gate_control_2?: string;
  gate_control_3?: string;
}

export interface PropertyUpdateInput {
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
export interface Resident {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  type: 'propietario' | 'inquilino';
  start_date: number;
  status: 'activo' | 'inactivo';
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type ResidentType = Resident['type'];
export type ResidentStatus = Resident['status'];

export interface ResidentCreateInput {
  full_name: string;
  phone: string;
  email: string;
  type: ResidentType;
  start_date: number;
  status?: ResidentStatus;
}

export interface ResidentUpdateInput {
  full_name?: string;
  phone?: string;
  email?: string;
  type?: ResidentType;
  start_date?: number;
  status?: ResidentStatus;
}

// ============================================================================
// RESIDENT PROPERTIES (Relación entre residentes y propiedades)
// ============================================================================
export interface ResidentProperty {
  id: string;
  resident_id: string;
  property_id: string;
  role: 'propietario' | 'residente_actual';
  start_date: number;
  end_date: number | null;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export type ResidentPropertyRole = ResidentProperty['role'];

export interface ResidentPropertyCreateInput {
  resident_id: string;
  property_id: string;
  role: ResidentPropertyRole;
  start_date: number;
  end_date?: number;
  is_active?: number;
}

export interface ResidentPropertyUpdateInput {
  role?: ResidentPropertyRole;
  end_date?: number;
  is_active?: number;
}

// ============================================================================
// MONTHLY FEES
// ============================================================================
export interface MonthlyFee {
  id: string;
  property_id: string;
  amount: number;
  discount_amount: number;
  discount_percentage: number;
  discount_applied_date: number | null;
  total_amount: number;
  due_date: number;
  payment_period: string; // Formato: YYYY-MM
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';
  paid_amount: number;
  balance: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type MonthlyFeeStatus = MonthlyFee['status'];

export interface MonthlyFeeCreateInput {
  property_id: string;
  amount: number;
  discount_amount?: number;
  discount_percentage?: number;
  discount_applied_date?: number;
  total_amount: number;
  due_date: number;
  payment_period: string;
  status?: MonthlyFeeStatus;
  balance: number;
  notes?: string;
}

export interface MonthlyFeeUpdateInput {
  status?: MonthlyFeeStatus;
  paid_amount?: number;
  balance?: number;
  notes?: string;
}

// ============================================================================
// PAYMENTS
// ============================================================================
export interface Payment {
  id: string;
  monthly_fee_id: string;
  property_id: string;
  amount: number;
  payment_method: 'cash' | 'transfer' | 'card' | 'check' | 'stripe' | 'mercadopago';
  payment_reference: string | null;
  payment_date: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  gateway_transaction_id: string | null;
  gateway_response: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export type PaymentMethod = Payment['payment_method'];
export type PaymentStatus = Payment['status'];

export interface PaymentCreateInput {
  monthly_fee_id: string;
  property_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  payment_date: number;
  status?: PaymentStatus;
  gateway_transaction_id?: string;
  gateway_response?: string;
  notes?: string;
  created_by?: string;
}

export interface PaymentUpdateInput {
  status?: PaymentStatus;
  gateway_transaction_id?: string;
  gateway_response?: string;
  notes?: string;
}

// ============================================================================
// LATE FEES
// ============================================================================
export interface LateFee {
  id: string;
  monthly_fee_id: string;
  property_id: string;
  base_amount: number;
  surcharge_percentage: number;
  surcharge_amount: number;
  months_overdue: number;
  applied_date: number;
  status: 'pending' | 'paid' | 'waived' | 'cancelled';
  waived_reason: string | null;
  waived_by: string | null;
  waived_date: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export type LateFeeStatus = LateFee['status'];

// ============================================================================
// PAYMENT RECEIPTS
// ============================================================================
export interface PaymentReceipt {
  id: string;
  payment_id: string;
  receipt_number: string;
  receipt_url: string | null;
  pdf_generated: number;
  issued_date: number;
  issued_by: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// VEHICLES
// ============================================================================
export interface Vehicle {
  id: string;
  property_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  status: 'activo' | 'inactivo';
  created_at: number;
  updated_at: number;
}

export type VehicleStatus = Vehicle['status'];

export interface VehicleCreateInput {
  property_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  status?: VehicleStatus;
}

export interface VehicleUpdateInput {
  brand?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  status?: VehicleStatus;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Tipo para resultados de consultas con joins
export interface PropertyWithRelations extends Property {
  owner?: Pick<Resident, 'id' | 'full_name' | 'email' | 'phone'>;
  current_resident?: Pick<Resident, 'id' | 'full_name' | 'email' | 'phone'>;
}

export interface ResidentWithDetails extends Resident {
  properties?: Array<Pick<Property, 'id' | 'house_number' | 'street'> & {
    role: ResidentPropertyRole;
    start_date: number;
    end_date: number | null;
  }>;
}

export interface MonthlyFeeWithProperty extends MonthlyFee {
  property?: Pick<Property, 'id' | 'house_number' | 'street'>;
}

export interface PaymentWithDetails extends Payment {
  property?: Pick<Property, 'id' | 'house_number' | 'street'>;
  monthly_fee?: Pick<MonthlyFee, 'id' | 'payment_period' | 'amount'>;
  created_by_user?: Pick<User, 'id' | 'full_name'>;
}

export interface VehicleWithProperty extends Vehicle {
  property?: Pick<Property, 'id' | 'house_number' | 'street'>;
}

// Tipo para paginación
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Made with Bob

// Tipos de Usuario
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// Tipos de Propiedad
export interface Property {
  id: string;
  house_number: string;
  street: string;
  status: 'ocupada' | 'desocupada' | 'en_renta' | 'en_venta';
  owner_id?: string;
  current_resident_id?: string;
  gate_control_1?: string;
  gate_control_2?: string;
  gate_control_3?: string;
  created_at: string;
  updated_at: string;
  // Relaciones populadas
  owner?: Resident;
  current_resident?: Resident;
}

// Tipos de Residente
export interface Resident {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  type: 'propietario' | 'inquilino';
  start_date: string; // ISO date string
  status: 'activo' | 'inactivo';
  created_at: string;
  updated_at: string;
  // Relaciones
  properties?: Array<{
    id: string;
    house_number: string;
    street: string;
    role: 'propietario' | 'residente_actual';
    start_date: string;
    end_date: string | null;
  }>;
}

// Tipos de Cuota Mensual
export interface MonthlyFee {
  id: string;
  property_id: string;
  period: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_date?: string;
  paid_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  property?: Property;
}

// Tipos de Pago
export interface Payment {
  id: string;
  property_id: string;
  monthly_fee_id?: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'transfer' | 'check' | 'card' | 'other';
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  property?: Property;
  monthly_fee?: MonthlyFee;
  created_by_user?: User;
}

// Tipos de Vehículo
export interface Vehicle {
  id: string;
  property_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  status: 'activo' | 'inactivo';
  created_at: string;
  updated_at: string;
  // Relación
  property?: Property;
}

// Tipos de Respuesta de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos de Autenticación
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      full_name: string;
      role: string;
      status: string;
    };
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

// Tipos de Estadísticas del Dashboard
export interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  pendingFees: number;
  overdueFeesCount: number;
  monthlyPayments: number;
  monthlyPaymentsAmount: number;
  recentPayments: Payment[];
  upcomingDueFees: MonthlyFee[];
}

// Tipos de Filtros
export interface PropertyFilters {
  street?: string;
  status?: Property['status'];
  search?: string;
}

export interface ResidentFilters {
  type?: 'propietario' | 'inquilino';
  status?: 'activo' | 'inactivo';
  search?: string;
}

export interface FeeFilters {
  property_id?: string;
  period?: string;
  status?: MonthlyFee['status'];
  from_date?: string;
  to_date?: string;
}

export interface PaymentFilters {
  property_id?: string;
  payment_method?: Payment['payment_method'];
  from_date?: string;
  to_date?: string;
}

export interface VehicleFilters {
  property_id?: string;
  status?: 'activo' | 'inactivo';
  search?: string; // Buscar por placas, marca o modelo
}

// Tipos de Formularios
export interface CreatePropertyInput {
  house_number: string;
  street: string;
  status: Property['status'];
  owner_id?: string;
  current_resident_id?: string;
  gate_control_1?: string;
  gate_control_2?: string;
  gate_control_3?: string;
}

export interface UpdatePropertyInput extends Partial<CreatePropertyInput> {
  id: string;
}

export interface CreateResidentInput {
  full_name: string;
  phone: string;
  email: string;
  type: 'propietario' | 'inquilino';
  start_date: number; // Unix timestamp (segundos)
  status?: 'activo' | 'inactivo';
  property_ids?: string[]; // IDs de propiedades a asociar
}

export interface UpdateResidentInput {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  type?: 'propietario' | 'inquilino';
  start_date?: string;
  status?: 'activo' | 'inactivo';
}

export interface CreatePaymentInput {
  property_id: string;
  monthly_fee_id?: string;
  amount: number;
  payment_date: string;
  payment_method: Payment['payment_method'];
  reference_number?: string;
  notes?: string;
}

export interface GenerateFeesInput {
  period: string;
  amount: number;
  due_date: string;
}

export interface CreateVehicleInput {
  property_id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  status?: 'activo' | 'inactivo';
}

export interface UpdateVehicleInput {
  id: string;
  brand?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  status?: 'activo' | 'inactivo';
}

// Made with Bob

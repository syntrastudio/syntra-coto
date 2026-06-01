/**
 * Esquemas de validación con Zod
 */

import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    identifier: z.string().optional(),
    password: z.string().min(1, 'La contraseña es requerida'),
  })
  .refine((d) => d.email || d.phone || d.identifier, {
    message: 'Debe proporcionar email, teléfono o identifier',
  });

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  phone: z.string().optional(),
  property_id: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'El refresh token es requerido'),
});

// ============================================================================
// PROPERTY SCHEMAS
// ============================================================================

// Helper: acepta string, null o vacío y normaliza a string|null
const nullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export const propertyCreateSchema = z.object({
  house_number: z.string().min(1, 'El número de casa es requerido'),
  street: z.string().min(1, 'La calle es requerida'),
  status: z.enum(['ocupada', 'desocupada', 'en_renta', 'en_venta']).optional(),
  owner_id: nullableString,
  current_resident_id: nullableString,
  gate_control_1: nullableString,
  gate_control_2: nullableString,
  gate_control_3: nullableString,
  initial_balance: z.number().optional(),
});

export const propertyUpdateSchema = z.object({
  house_number: z.string().min(1).optional(),
  street: z.string().min(1).optional(),
  status: z.enum(['ocupada', 'desocupada', 'en_renta', 'en_venta']).optional(),
  owner_id: nullableString,
  current_resident_id: nullableString,
  gate_control_1: nullableString,
  gate_control_2: nullableString,
  gate_control_3: nullableString,
});

export const propertyListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['ocupada', 'desocupada', 'en_renta', 'en_venta']).optional(),
  search: z.string().optional(),
  sort_by: z.enum(['house_number', 'street', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ============================================================================
// RESIDENT SCHEMAS
// ============================================================================

export const residentCreateSchema = z.object({
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  phone: z.string().regex(/^\d{10}$/, 'El teléfono debe tener 10 dígitos'),
  email: z.string().email('Email inválido'),
  type: z.enum(['propietario', 'inquilino']),
  start_date: z.number().int().positive(),
  status: z.enum(['activo', 'inactivo']).optional(),
  property_ids: z.array(z.string()).optional(),
});

export const residentUpdateSchema = z.object({
  full_name: z.string().min(3).optional(),
  phone: z.string().regex(/^\d{10}$/, 'El teléfono debe tener 10 dígitos').optional(),
  email: z.string().email('Email inválido').optional(),
  type: z.enum(['propietario', 'inquilino']).optional(),
  start_date: z.number().int().positive().optional(),
  status: z.enum(['activo', 'inactivo']).optional(),
});

export const residentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(['propietario', 'inquilino']).optional(),
  status: z.enum(['activo', 'inactivo']).optional(),
  search: z.string().optional(),
  sort_by: z.enum(['full_name', 'email', 'start_date', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// MONTHLY FEE SCHEMAS
// ============================================================================

export const generateFeesSchema = z.object({
  payment_period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Formato inválido. Use YYYY-MM'),
  base_amount: z.number().positive('El monto base debe ser positivo'),
  discount_percentage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(10),
  discount_days: z.number().int().positive().optional().default(16),
});

export const monthlyFeeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  property_id: z.string().optional(),
  status: z
    .enum(['pending', 'paid', 'overdue', 'cancelled', 'partially_paid'])
    .optional(),
  payment_period: z.string().optional(),
  from_date: z.coerce.number().int().positive().optional(),
  to_date: z.coerce.number().int().positive().optional(),
});

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const paymentCreateSchema = z
  .object({
    monthly_fee_id: z.string().optional(),
    property_id: z.string().optional(),
    amount: z.number().positive('El monto debe ser positivo'),
    payment_method: z.enum(['cash', 'transfer', 'card', 'check', 'stripe', 'mercadopago']),
    payment_reference: z.string().optional(),
    payment_date: z.number().int().positive(),
    notes: z.string().optional(),
    received_by_user_id: z.string().optional(),
  })
  .refine((d) => d.monthly_fee_id || d.property_id, {
    message: 'Debe proporcionar monthly_fee_id o property_id',
  });

export const annualPaymentSchema = z.object({
  property_id: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  payment_method: z.enum(['cash', 'transfer', 'card', 'check', 'stripe', 'mercadopago']),
  payment_reference: z.string().optional(),
  payment_date: z.number().int().positive(),
  notes: z.string().optional(),
  received_by_user_id: z.string().optional(),
});

export const paymentUpdateSchema = z.object({
  status: z
    .enum(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .optional(),
  gateway_transaction_id: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  property_id: z.string().optional(),
  monthly_fee_id: z.string().optional(),
  status: z
    .enum(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
    .optional(),
  payment_method: z
    .enum(['cash', 'transfer', 'card', 'check', 'stripe', 'mercadopago'])
    .optional(),
  from_date: z.coerce.number().int().positive().optional(),
  to_date: z.coerce.number().int().positive().optional(),
});

// ============================================================================
// VEHICLE SCHEMAS
// ============================================================================

export const vehicleCreateSchema = z.object({
  property_id: z.string().min(1, 'El ID de propiedad es requerido'),
  vehicle_type: z.enum(['automovil', 'motocicleta', 'otro']).optional().default('automovil'),
  brand: z.string().min(1, 'La marca es requerida'),
  model: z.string().min(1, 'El modelo es requerido'),
  year: z
    .number()
    .int()
    .min(1900, 'El año debe ser mayor a 1900')
    .max(new Date().getFullYear() + 1, `El año no puede ser mayor a ${new Date().getFullYear() + 1}`),
  license_plate: z.string().min(1, 'Las placas son requeridas'),
  color: z.string().min(1, 'El color es requerido'),
  status: z.enum(['activo', 'inactivo']).optional(),
});

export const vehicleUpdateSchema = z.object({
  vehicle_type: z.enum(['automovil', 'motocicleta', 'otro']).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  license_plate: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  status: z.enum(['activo', 'inactivo']).optional(),
});

export const vehicleListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  property_id: z.string().optional(),
  status: z.enum(['activo', 'inactivo']).optional(),
  search: z.string().optional(),
  sort_by: z.enum(['brand', 'model', 'year', 'license_plate', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID inválido'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Valida datos contra un schema de Zod
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Valida datos y retorna errores en formato amigable
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Valida formato de email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de teléfono mexicano (10 dígitos)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
}

// Made with Bob

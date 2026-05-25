import { z } from 'zod';
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  REGEX_PATTERNS,
} from '../constants';

// Validadores comunes
export const emailSchema = z
  .string()
  .email('Email inválido')
  .max(MAX_EMAIL_LENGTH, `Email debe tener máximo ${MAX_EMAIL_LENGTH} caracteres`);

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Contraseña debe tener mínimo ${MIN_PASSWORD_LENGTH} caracteres`)
  .max(MAX_PASSWORD_LENGTH, `Contraseña debe tener máximo ${MAX_PASSWORD_LENGTH} caracteres`);

export const nameSchema = z
  .string()
  .min(1, 'Nombre es requerido')
  .max(MAX_NAME_LENGTH, `Nombre debe tener máximo ${MAX_NAME_LENGTH} caracteres`);

export const phoneSchema = z
  .string()
  .regex(REGEX_PATTERNS.PHONE, 'Teléfono debe tener 10 dígitos');

// Validador de login
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Contraseña es requerida'),
});

// Validador de registro de usuario
export const registerUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema.optional(),
});

// Validador de actualización de perfil
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.optional(),
});

// Validador de cambio de contraseña
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual es requerida'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// Validador de paginación
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

// Validador de ID
export const idSchema = z.number().int().positive();

// Validador de fecha
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)');

// Tipos inferidos de los schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

// Made with Bob

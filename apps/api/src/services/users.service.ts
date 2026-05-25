/**
 * Users Service
 * Gestión de usuarios administrativos con control de roles y permisos
 */

import { hashPassword } from '../utils/hash';

interface User {
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

interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'supervisor' | 'resident';
  status?: 'active' | 'inactive';
}

interface UpdateUserInput {
  email?: string;
  full_name?: string;
  phone?: string;
  role?: 'admin' | 'supervisor' | 'resident';
  status?: 'active' | 'inactive' | 'suspended';
}

export class UsersService {
  constructor(private db: D1Database) {}

  /**
   * Listar usuarios con filtros
   */
  async listUsers(filters?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM users WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (filters?.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.search) {
      query += ' AND (full_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Contar total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await this.db.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total || 0;

    // Obtener usuarios paginados
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(query).bind(...params).all<User>();

    // Remover password_hash de la respuesta
    const users = result.results.map(user => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword as any;
    });

    return {
      users,
      total,
      page,
      limit
    };
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await this.db
      .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
      .bind(userId)
      .first<User>();

    if (!user) return null;

    // Remover password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
  }

  /**
   * Crear nuevo usuario (solo super_admin)
   */
  async createUser(
    input: CreateUserInput,
    createdBy: string,
    creatorRole: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    // Validar permisos: solo super_admin puede crear usuarios
    if (creatorRole !== 'super_admin') {
      return { success: false, error: 'Solo super administradores pueden crear usuarios' };
    }

    // Validar que no se intente crear un super_admin
    if (input.role === 'super_admin' as any) {
      return { success: false, error: 'No se puede crear usuarios super_admin desde esta API' };
    }

    // Validar email único
    const existingUser = await this.db
      .prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL')
      .bind(input.email)
      .first();

    if (existingUser) {
      return { success: false, error: 'El email ya está registrado' };
    }

    // Validar contraseña fuerte
    if (!this.isStrongPassword(input.password)) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números'
      };
    }

    // Hashear contraseña
    const passwordHash = await hashPassword(input.password);

    // Crear usuario
    const userId = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(`
        INSERT INTO users (
          id, email, password_hash, full_name, phone, role, status,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        input.email,
        passwordHash,
        input.full_name,
        input.phone || null,
        input.role,
        input.status || 'active',
        createdBy,
        now,
        now
      )
      .run();

    return { success: true, userId };
  }

  /**
   * Actualizar usuario
   */
  async updateUser(
    userId: string,
    input: UpdateUserInput,
    updatedBy: string,
    updaterRole: string
  ): Promise<{ success: boolean; error?: string }> {
    // Obtener usuario actual
    const user = await this.db
      .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
      .bind(userId)
      .first<User>();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Validar permisos
    if (updaterRole !== 'super_admin') {
      // Los admins solo pueden actualizar su propio perfil (excepto rol)
      if (userId !== updatedBy) {
        return { success: false, error: 'No tienes permisos para actualizar este usuario' };
      }
      // No pueden cambiar su propio rol
      if (input.role) {
        return { success: false, error: 'No puedes cambiar tu propio rol' };
      }
    }

    // No permitir cambiar rol a super_admin
    if (input.role === 'super_admin' as any) {
      return { success: false, error: 'No se puede asignar el rol super_admin' };
    }

    // Validar email único si se está cambiando
    if (input.email && input.email !== user.email) {
      const existingUser = await this.db
        .prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL AND id != ?')
        .bind(input.email, userId)
        .first();

      if (existingUser) {
        return { success: false, error: 'El email ya está registrado' };
      }
    }

    // Construir query de actualización
    const updates: string[] = [];
    const params: any[] = [];

    if (input.email) {
      updates.push('email = ?');
      params.push(input.email);
    }
    if (input.full_name) {
      updates.push('full_name = ?');
      params.push(input.full_name);
    }
    if (input.phone !== undefined) {
      updates.push('phone = ?');
      params.push(input.phone || null);
    }
    if (input.role) {
      updates.push('role = ?');
      params.push(input.role);
    }
    if (input.status) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (updates.length === 0) {
      return { success: false, error: 'No hay campos para actualizar' };
    }

    params.push(userId);

    await this.db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();

    return { success: true };
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(
    userId: string,
    newPassword: string,
    changedBy: string,
    changerRole: string
  ): Promise<{ success: boolean; error?: string }> {
    // Validar permisos: super_admin puede cambiar cualquier contraseña, otros solo la suya
    if (changerRole !== 'super_admin' && userId !== changedBy) {
      return { success: false, error: 'No tienes permisos para cambiar esta contraseña' };
    }

    // Validar contraseña fuerte
    if (!this.isStrongPassword(newPassword)) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números'
      };
    }

    // Hashear nueva contraseña
    const passwordHash = await hashPassword(newPassword);

    await this.db
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(passwordHash, userId)
      .run();

    return { success: true };
  }

  /**
   * Activar/Desactivar usuario
   */
  async toggleUserStatus(
    userId: string,
    newStatus: 'active' | 'inactive',
    changedBy: string,
    changerRole: string
  ): Promise<{ success: boolean; error?: string }> {
    // Solo super_admin puede cambiar estados
    if (changerRole !== 'super_admin') {
      return { success: false, error: 'Solo super administradores pueden cambiar estados de usuarios' };
    }

    // No permitir que un usuario se desactive a sí mismo
    if (userId === changedBy) {
      return { success: false, error: 'No puedes cambiar tu propio estado' };
    }

    await this.db
      .prepare('UPDATE users SET status = ? WHERE id = ?')
      .bind(newStatus, userId)
      .run();

    return { success: true };
  }

  /**
   * Eliminar usuario (soft delete)
   */
  async deleteUser(
    userId: string,
    deletedBy: string,
    deleterRole: string
  ): Promise<{ success: boolean; error?: string }> {
    // Solo super_admin puede eliminar usuarios
    if (deleterRole !== 'super_admin') {
      return { success: false, error: 'Solo super administradores pueden eliminar usuarios' };
    }

    // No permitir que un usuario se elimine a sí mismo
    if (userId === deletedBy) {
      return { success: false, error: 'No puedes eliminarte a ti mismo' };
    }

    // Obtener usuario
    const user = await this.db
      .prepare('SELECT role FROM users WHERE id = ? AND deleted_at IS NULL')
      .bind(userId)
      .first<{ role: string }>();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // No permitir eliminar el último super_admin
    if (user.role === 'super_admin') {
      const superAdminCount = await this.db
        .prepare('SELECT COUNT(*) as count FROM users WHERE role = ? AND deleted_at IS NULL')
        .bind('super_admin')
        .first<{ count: number }>();

      if (superAdminCount && superAdminCount.count <= 1) {
        return { success: false, error: 'No se puede eliminar el último super administrador' };
      }
    }

    // Soft delete
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare('UPDATE users SET deleted_at = ? WHERE id = ?')
      .bind(now, userId)
      .run();

    return { success: true };
  }

  /**
   * Actualizar último login
   */
  async updateLastLogin(userId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
      .bind(now, userId)
      .run();
  }

  /**
   * Validar contraseña fuerte
   */
  private isStrongPassword(password: string): boolean {
    // Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return minLength && hasUpperCase && hasLowerCase && hasNumber;
  }

  /**
   * Generar ID único
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Made with Bob

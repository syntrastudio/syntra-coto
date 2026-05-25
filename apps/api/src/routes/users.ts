/**
 * Users Routes
 * Endpoints para gestión de usuarios administrativos
 */

import { Hono } from 'hono';
import { UsersService } from '../services/users.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { successResponse, errorResponse } from '../utils/response';

const users = new Hono<{ Bindings: Env }>();

// Aplicar autenticación a todas las rutas
users.use('/*', authMiddleware);

/**
 * GET /api/users
 * Listar usuarios (solo admin y super_admin)
 */
users.get('/', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const usersService = new UsersService(c.env.DB);
    
    // Obtener parámetros de query
    const role = c.req.query('role');
    const status = c.req.query('status');
    const search = c.req.query('search');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');

    const result = await usersService.listUsers({
      role,
      status,
      search,
      page,
      limit
    });

    return c.json(successResponse(result));
  } catch (error: any) {
    console.error('Error listing users:', error);
    return c.json(errorResponse('Error al listar usuarios', error.message), 500);
  }
});

/**
 * GET /api/users/:id
 * Obtener usuario individual
 */
users.get('/:id', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const userId = c.req.param('id');
    const usersService = new UsersService(c.env.DB);

    const user = await usersService.getUserById(userId);

    if (!user) {
      return c.json(errorResponse('Usuario no encontrado'), 404);
    }

    return c.json(successResponse(user));
  } catch (error: any) {
    console.error('Error getting user:', error);
    return c.json(errorResponse('Error al obtener usuario', error.message), 500);
  }
});

/**
 * POST /api/users
 * Crear nuevo usuario (solo super_admin)
 */
users.post('/', requireRole('super_admin'), async (c) => {
  try {
    const body = await c.req.json();
    const currentUser = c.get('user')!;
    const usersService = new UsersService(c.env.DB);

    // Validar campos requeridos
    if (!body.email || !body.password || !body.full_name || !body.role) {
      return c.json(
        errorResponse('Campos requeridos: email, password, full_name, role'),
        400
      );
    }

    // Validar rol válido
    if (!['admin', 'supervisor', 'resident'].includes(body.role)) {
      return c.json(
        errorResponse('Rol inválido. Debe ser: admin, supervisor o resident'),
        400
      );
    }

    const result = await usersService.createUser(
      {
        email: body.email,
        password: body.password,
        full_name: body.full_name,
        phone: body.phone,
        role: body.role,
        status: body.status
      },
      currentUser.id,
      currentUser.role
    );

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Error al crear usuario'), 400);
    }

    return c.json(successResponse({ userId: result.userId }), 201);
  } catch (error: any) {
    console.error('Error creating user:', error);
    return c.json(errorResponse('Error al crear usuario', error.message), 500);
  }
});

/**
 * PUT /api/users/:id
 * Actualizar usuario
 */
users.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const currentUser = c.get('user')!;
    const usersService = new UsersService(c.env.DB);

    // Validar que al menos un campo esté presente
    if (!body.email && !body.full_name && body.phone === undefined && !body.role && !body.status) {
      return c.json(
        errorResponse('Debe proporcionar al menos un campo para actualizar'),
        400
      );
    }

    const result = await usersService.updateUser(
      userId,
      {
        email: body.email,
        full_name: body.full_name,
        phone: body.phone,
        role: body.role,
        status: body.status
      },
      currentUser.id,
      currentUser.role
    );

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Error al actualizar usuario'), 400);
    }

    return c.json(successResponse({ message: 'Usuario actualizado correctamente' }));
  } catch (error: any) {
    console.error('Error updating user:', error);
    return c.json(errorResponse('Error al actualizar usuario', error.message), 500);
  }
});

/**
 * PUT /api/users/:id/change-password
 * Cambiar contraseña
 */
users.put('/:id/change-password', requireRole('admin', 'super_admin', 'supervisor', 'resident'), async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const currentUser = c.get('user')!;
    const usersService = new UsersService(c.env.DB);

    if (!body.newPassword) {
      return c.json(errorResponse('Campo requerido: newPassword'), 400);
    }

    const result = await usersService.changePassword(
      userId,
      body.newPassword,
      currentUser.id,
      currentUser.role
    );

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Error al cambiar contraseña'), 400);
    }

    return c.json(successResponse({ message: 'Contraseña actualizada correctamente' }));
  } catch (error: any) {
    console.error('Error changing password:', error);
    return c.json(errorResponse('Error al cambiar contraseña', error.message), 500);
  }
});

/**
 * PUT /api/users/:id/toggle-status
 * Activar/Desactivar usuario (solo super_admin)
 */
users.put('/:id/toggle-status', requireRole('super_admin'), async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const currentUser = c.get('user')!;
    const usersService = new UsersService(c.env.DB);

    if (!body.status || !['active', 'inactive'].includes(body.status)) {
      return c.json(
        errorResponse('Campo requerido: status (active o inactive)'),
        400
      );
    }

    const result = await usersService.toggleUserStatus(
      userId,
      body.status,
      currentUser.id,
      currentUser.role
    );

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Error al cambiar estado'), 400);
    }

    return c.json(successResponse({ message: 'Estado actualizado correctamente' }));
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    return c.json(errorResponse('Error al cambiar estado', error.message), 500);
  }
});

/**
 * DELETE /api/users/:id
 * Eliminar usuario (solo super_admin)
 */
users.delete('/:id', requireRole('super_admin'), async (c) => {
  try {
    const userId = c.req.param('id');
    const currentUser = c.get('user')!;
    const usersService = new UsersService(c.env.DB);

    const result = await usersService.deleteUser(
      userId,
      currentUser.id,
      currentUser.role
    );

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Error al eliminar usuario'), 400);
    }

    return c.json(successResponse({ message: 'Usuario eliminado correctamente' }));
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return c.json(errorResponse('Error al eliminar usuario', error.message), 500);
  }
});

export default users;

// Made with Bob

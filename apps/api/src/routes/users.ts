/**
 * Users Routes
 * Endpoints para gestión de usuarios administrativos
 */

import { Hono } from 'hono';
import { UsersService } from '../services/users.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { successResponse, errorResponse } from '../utils/response';
import { sendEmail, welcomeEmailHTML } from '../utils/email';

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

// Debe declararse ANTES de /:id para que Hono no lo capture como param
users.get('/available-residents', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const usersService = new UsersService(c.env.DB);
    const list = await usersService.listResidentsWithoutUser();
    return c.json(successResponse(list));
  } catch (error: any) {
    console.error('Error listing available residents:', error);
    return c.json(errorResponse('Error al listar residentes', error.message), 500);
  }
});

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

users.post('/', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const body = await c.req.json();
    const currentUser = c.get('user')!;
    const usersService = new UsersService(c.env.DB);

    if (!body.role) {
      return c.json(errorResponse('El rol es requerido'), 400);
    }
    if (!['admin', 'supervisor', 'resident', 'super_admin'].includes(body.role)) {
      return c.json(errorResponse('Rol inválido'), 400);
    }
    if (!body.resident_id && (!body.email || !body.full_name)) {
      return c.json(errorResponse('Debe proporcionar resident_id o (email + full_name)'), 400);
    }

    const result = await usersService.createUser(
      {
        resident_id: body.resident_id,
        email: body.email,
        password: body.password,
        full_name: body.full_name,
        phone: body.phone,
        role: body.role,
        status: body.status,
      },
      currentUser.id,
      currentUser.role
    );

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Error al crear usuario'), 400);
    }

    // Si se generó password temporal, enviarlo por correo
    let emailStatus: { sent: boolean; skipped?: boolean; reason?: string } | null = null;
    if (result.tempPassword && result.email && result.fullName) {
      const loginUrl = ((c.env.APP_URL || c.env.FRONTEND_URL || 'https://coto.syntrastudio.dev').replace(/\/+$/, '').replace(/\/login$/i, '')) + '/login';
      const contactPhone = await c.env.DB
        .prepare("SELECT value FROM system_settings WHERE key = 'contact_phone'")
        .first<{ value: string }>();

      emailStatus = await sendEmail(c.env, {
        to: result.email,
        subject: 'Bienvenido al portal de Paseo Coto Tonalá',
        html: welcomeEmailHTML({
          full_name: result.fullName,
          email: result.email,
          temp_password: result.tempPassword,
          login_url: loginUrl,
          contact_phone: contactPhone?.value || undefined,
        }),
        text: `Hola ${result.fullName},\n\nBienvenido a Paseo Coto Tonalá. Datos de acceso:\nUsuario: ${result.email}\nContraseña: ${result.tempPassword}\n\nIngresa en: ${loginUrl}`,
      });
    }

    return c.json(
      successResponse({
        userId: result.userId,
        email_sent: emailStatus?.sent ?? false,
        email_skipped: emailStatus?.skipped ?? false,
        email_reason: emailStatus?.reason,
      }),
      201
    );
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
 * POST /api/users/:id/reset-password
 * Solo admin/super_admin. Restablece la contraseña del usuario.
 * - Si el body trae `password`, la asigna (debe pasar validación de fortaleza).
 * - Si no, genera una temporal aleatoria.
 * En cualquier caso, envía un correo al usuario con la nueva contraseña.
 * Si el email no está configurado en el server (no RESEND_API_KEY), devuelve la
 * contraseña temporal en la respuesta para que el admin la comparta manualmente.
 */
users.post('/:id/reset-password', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const userId = c.req.param('id');
    const currentUser = c.get('user')!;
    const body = await c.req.json<{ password?: string; send_email?: boolean }>().catch(() => ({}));
    const usersService = new UsersService(c.env.DB);

    const target = await usersService.getUserById(userId);
    if (!target) return c.json(errorResponse('Usuario no encontrado'), 404);

    if (target.role === 'super_admin' && currentUser.role !== 'super_admin') {
      return c.json(errorResponse('Solo super_admin puede resetear a otro super_admin'), 403);
    }

    const { generateTempPassword } = await import('../utils/email');
    const usedGenerated = !body.password;
    const newPassword = body.password || generateTempPassword();

    const result = await usersService.changePassword(
      userId,
      newPassword,
      currentUser.id,
      'super_admin' // bypass del check propietario; el rol del caller ya se validó arriba
    );
    if (!result.success) {
      return c.json(errorResponse(result.error || 'Error al restablecer contraseña'), 400);
    }

    // Forzar que el usuario establezca su propia contraseña al ingresar.
    await c.env.DB.prepare('UPDATE users SET must_change_password = 1 WHERE id = ?').bind(userId).run();

    // Enviar correo con la contraseña + notificación de cambio
    let emailStatus: { sent: boolean; skipped?: boolean; reason?: string } | null = null;
    const shouldSend = body.send_email !== false;
    if (shouldSend) {
      const { sendEmail, passwordResetByAdminHTML, passwordChangedNoticeHTML } = await import('../utils/email');
      const loginUrl = ((c.env.APP_URL || c.env.FRONTEND_URL || 'https://coto.syntrastudio.dev').replace(/\/+$/, '').replace(/\/login$/i, '')) + '/login';
      const contactRow = await c.env.DB
        .prepare("SELECT value FROM system_settings WHERE key = 'contact_phone'")
        .first<{ value: string }>();

      emailStatus = await sendEmail(c.env, {
        to: target.email,
        subject: 'Tu contraseña fue restablecida — Paseo Coto Tonalá',
        html: passwordResetByAdminHTML({
          full_name: target.full_name,
          email: target.email,
          temp_password: newPassword,
          login_url: loginUrl,
          admin_name: currentUser.full_name,
          contact_phone: contactRow?.value || undefined,
        }),
        text: `Hola ${target.full_name},\n\n${currentUser.full_name || 'Un administrador'} restableció tu contraseña.\nUsuario: ${target.email}\nNueva contraseña: ${newPassword}\n\nIngresa en: ${loginUrl}\n\nTe recomendamos cambiarla en cuanto ingreses.`,
      });

      // Notificación adicional de "tu contraseña cambió" (best effort, no bloquea)
      try {
        await sendEmail(c.env, {
          to: target.email,
          subject: 'Contraseña actualizada — Paseo Coto Tonalá',
          html: passwordChangedNoticeHTML({
            full_name: target.full_name,
            changed_at: new Date(),
            ip_address: c.req.header('cf-connecting-ip') || undefined,
            by_admin: true,
            contact_phone: contactRow?.value || undefined,
          }),
        });
      } catch {}
    }

    return c.json(
      successResponse({
        message: 'Contraseña restablecida',
        email_sent: emailStatus?.sent ?? false,
        email_skipped: emailStatus?.skipped ?? false,
        // Devolvemos la contraseña SOLO si el admin la generó automáticamente
        // y el correo no se envió (para que pueda comunicarla manualmente).
        temp_password:
          usedGenerated && (!emailStatus?.sent ? newPassword : undefined),
      })
    );
  } catch (error: any) {
    console.error('Error reset-password:', error);
    return c.json(errorResponse('Error al restablecer contraseña', error.message), 500);
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

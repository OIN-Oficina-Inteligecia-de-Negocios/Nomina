import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

// Solo administradores pueden acceder a este router
adminRouter.use((request, _response, next) => {
  if (request.user!.role !== 'ADMIN') {
    return next(new AppError('No tienes permisos para acceder a este módulo', 403, 'FORBIDDEN'));
  }
  next();
});

/** GET /api/admin/zonas — Lista zonas únicas de la tabla zonas (solo BD) */
adminRouter.get('/zonas', async (_request, response) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT spt 
     FROM zonas 
     WHERE spt IS NOT NULL AND spt <> '' 
     ORDER BY spt ASC`
  );
  response.json({ zonas: rows.map((r: { spt: string }) => r.spt) });
});

/** GET /api/admin/users — Lista todos los usuarios */
adminRouter.get('/users', async (_request, response) => {
  const { rows } = await pool.query(
    `SELECT id, email, display_name, role, zona_asignada, active, must_change_password, created_at, updated_at
     FROM Usuarios_Nomina
     ORDER BY active DESC, display_name ASC`,
  );
  response.json({ users: rows });
});

/** POST /api/admin/users — Crea un usuario nuevo */
adminRouter.post('/users', async (request, response) => {
  const input = z
    .object({
      email: z.string().email('Correo no válido'),
      displayName: z.string().min(2, 'Mínimo 2 caracteres').max(255),
      role: z.enum(['ADMIN', 'REVIEWER', 'GESTION']).default('REVIEWER'),
      zonaAsignada: z.string().trim().max(120).optional(),
      password: z.string().min(6, 'Mínimo 6 caracteres'),
    })
    .parse(request.body);

  const { rows: existing } = await pool.query(
    `SELECT id FROM Usuarios_Nomina WHERE email = $1`,
    [input.email.toLowerCase()],
  );
  if (existing.length > 0) {
    throw new AppError('Ya existe un usuario con ese correo', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const { rows } = await pool.query(
    `INSERT INTO Usuarios_Nomina
       (email, password_hash, display_name, role, zona_asignada, must_change_password)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id, email, display_name, role, zona_asignada, active, must_change_password, created_at`,
    [
      input.email.toLowerCase(),
      passwordHash,
      input.displayName,
      input.role,
      input.zonaAsignada ?? null,
    ],
  );
  response.status(201).json({ user: rows[0] });
});

/** PATCH /api/admin/users/:id — Actualiza zona, rol o estado de un usuario */
adminRouter.patch('/users/:id', async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);

  // Evitar que el admin se modifique a sí mismo desde este panel
  if (id === request.user!.id) {
    throw new AppError('No puedes modificar tu propia cuenta desde este panel', 400, 'SELF_MODIFY');
  }

  const input = z
    .object({
      displayName: z.string().min(2).max(255).optional(),
      role: z.enum(['ADMIN', 'REVIEWER', 'GESTION']).optional(),
      zonaAsignada: z.string().trim().max(120).nullable().optional(),
      active: z.boolean().optional(),
    })
    .parse(request.body);

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.displayName !== undefined) {
    values.push(input.displayName);
    updates.push(`display_name = $${values.length}`);
  }
  if (input.role !== undefined) {
    values.push(input.role);
    updates.push(`role = $${values.length}`);
  }
  if (input.zonaAsignada !== undefined) {
    values.push(input.zonaAsignada);
    updates.push(`zona_asignada = $${values.length}`);
  }
  if (input.active !== undefined) {
    values.push(input.active);
    updates.push(`active = $${values.length}`);
  }

  if (!updates.length) {
    throw new AppError('No se enviaron cambios', 400, 'NO_CHANGES');
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE Usuarios_Nomina
     SET ${updates.join(', ')}
     WHERE id = $${values.length}
     RETURNING id, email, display_name, role, zona_asignada, active, must_change_password, updated_at`,
    values,
  );

  if (!rows.length) {
    throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  }
  response.json({ user: rows[0] });
});

/** POST /api/admin/users/:id/reset-password — Restablece la contraseña de un usuario */
adminRouter.post('/users/:id/reset-password', async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const input = z
    .object({
      password: z.string().min(6, 'Mínimo 6 caracteres').optional(),
    })
    .parse(request.body ?? {});

  const newPassword = input.password || 'Nomina2026*';
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const { rows } = await pool.query(
    `UPDATE Usuarios_Nomina
     SET password_hash = $1, must_change_password = TRUE, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, display_name, role, zona_asignada, active, must_change_password, updated_at`,
    [passwordHash, id],
  );

  if (!rows.length) {
    throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  }

  response.json({ user: rows[0], temporaryPassword: newPassword });
});

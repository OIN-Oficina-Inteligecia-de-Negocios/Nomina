import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';

export const authRouter = Router();

authRouter.post('/login', async (request, response) => {
  const input = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .parse(request.body);

  const result = await pool.query(
    `SELECT id, email, password_hash, display_name, role, must_change_password, zona_asignada
     FROM Usuarios_Nomina WHERE email = $1 AND active = TRUE`,
    [input.email.toLowerCase()],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    throw new AppError('Correo o contraseña incorrectos', 401, 'INVALID_LOGIN');
  }

  const token = jwt.sign(
    {
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      zonaAsignada: user.zona_asignada,
      mustChangePassword: user.must_change_password,
    },
    env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    },
  );

  response.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      zonaAsignada: user.zona_asignada,
      mustChangePassword: user.must_change_password,
    },
  });
});

authRouter.post('/change-password', requireAuth, async (request, response) => {
  const input = z
    .object({ newPassword: z.string().min(6) })
    .parse(request.body);

  const passwordHash = await bcrypt.hash(input.newPassword, 12);

  // Se actualiza y se recupera la zona asignada
  const { rows } = await pool.query(
    `UPDATE Usuarios_Nomina
     SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
     WHERE id = $2
     RETURNING zona_asignada`,
    [passwordHash, request.user!.id],
  );
  const zonaAsignada = rows[0]?.zona_asignada ?? null;

  const token = jwt.sign(
    {
      email: request.user!.email,
      displayName: request.user!.displayName,
      role: request.user!.role,
      zonaAsignada,
      mustChangePassword: false,
    },
    env.JWT_SECRET,
    {
      subject: String(request.user!.id),
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    },
  );

  response.json({
    token,
    user: {
      id: request.user!.id,
      email: request.user!.email,
      displayName: request.user!.displayName,
      role: request.user!.role,
      zonaAsignada,
      mustChangePassword: false,
    },
  });
});

authRouter.get('/me', requireAuth, (request, response) => {
  response.json({ user: request.user });
});

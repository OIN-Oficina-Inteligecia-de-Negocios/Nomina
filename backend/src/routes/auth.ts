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
    `SELECT id, email, password_hash, display_name, role
     FROM app_users WHERE email = $1 AND active = TRUE`,
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
    },
  });
});

authRouter.get('/me', requireAuth, (request, response) => {
  response.json({ user: request.user });
});

import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool } from './pool.js';

export async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO app_users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, 'ADMIN')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           active = TRUE,
           updated_at = NOW()`,
    [env.ADMIN_EMAIL.toLowerCase(), passwordHash, 'Administrador LIA'],
  );
}

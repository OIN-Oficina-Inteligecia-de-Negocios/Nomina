import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool } from './pool.js';

export async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const adminEmail = env.ADMIN_EMAIL.toLowerCase();

  const existing = await pool.query(
    `SELECT id FROM Usuarios_Nomina WHERE LOWER(email) = $1`,
    [adminEmail],
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE Usuarios_Nomina
       SET password_hash = $1, active = TRUE, updated_at = NOW()
       WHERE LOWER(email) = $2`,
      [passwordHash, adminEmail],
    );
  } else {
    await pool.query(
      `INSERT INTO Usuarios_Nomina (email, password_hash, display_name, role, must_change_password, zona_asignada)
       VALUES ($1, $2, $3, 'ADMIN', TRUE, NULL)`,
      [adminEmail, passwordHash, 'Administrador LIA'],
    );
  }
}

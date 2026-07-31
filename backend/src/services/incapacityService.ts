import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errors.js';

export const detailSelect = `
  SELECT
    i.id,
    i.chat_id,
    i.tipo,
    i.datos,
    i.estado_tramite,
    i.url_documento,
    i.nombre_archivo,
    i.fecha_creacion,
    p.cedula,
    p.nombre_completo,
    COALESCE(p.eps_nombre, p.eps) AS eps,
    p.jefe_inmediato,
    COALESCE(p.zona_spt, p.zona_area) AS zona_area
  FROM incapacidades i
  LEFT JOIN perfil_empleado p ON p.chat_id = i.chat_id
`;

export async function getIncapacity(id: number, client: PoolClient | typeof pool = pool) {
  const result = await client.query(`${detailSelect} WHERE i.id = $1`, [id]);
  if (!result.rowCount) {
    throw new AppError('La incapacidad no existe', 404, 'NOT_FOUND');
  }
  return result.rows[0];
}

export async function decideIncapacity(input: {
  id: number;
  action: 'APROBADA' | 'DENEGADA';
  observation?: string;
  reviewerEmail: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      'SELECT estado_tramite FROM incapacidades WHERE id = $1 FOR UPDATE',
      [input.id],
    );
    if (!locked.rowCount) {
      throw new AppError('La incapacidad no existe', 404, 'NOT_FOUND');
    }
    if (locked.rows[0].estado_tramite !== 'PENDIENTE_REVISION') {
      throw new AppError(
        'Este radicado ya fue procesado',
        409,
        'ALREADY_PROCESSED',
      );
    }

    const decisionData = {
      decision: {
        status: input.action,
        observation: input.observation ?? null,
        reviewerEmail: input.reviewerEmail,
        decidedAt: new Date().toISOString(),
      },
    };

    await client.query(
      `UPDATE incapacidades
       SET estado_tramite = $2,
           datos = COALESCE(datos, '{}'::jsonb) || $3::jsonb
       WHERE id = $1`,
      [input.id, input.action, JSON.stringify(decisionData)],
    );
    await client.query(
      `INSERT INTO approval_history
        (incapacidad_id, action, observation, reviewer_email)
       VALUES ($1, $2, $3, $4)`,
      [
        input.id,
        input.action,
        input.observation ?? null,
        input.reviewerEmail,
      ],
    );

    const updated = await getIncapacity(input.id, client);
    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

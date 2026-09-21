import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (request, response) => {
  const user = request.user!;

  if (user.role === 'ADMIN') {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE estado_tramite = 'PENDIENTE_REVISION')::int AS pending,
        COUNT(*) FILTER (WHERE estado_tramite = 'APROBADA')::int AS approved,
        COUNT(*) FILTER (WHERE estado_tramite = 'DENEGADA')::int AS denied,
        COUNT(*) FILTER (
          WHERE estado_tramite = 'PENDIENTE_REVISION'
            AND fecha_creacion < NOW() - INTERVAL '24 hours'
        )::int AS pending_over_24h
      FROM incapacidades
    `);
    return response.json(result.rows[0]);
  }

  if (user.role === 'GESTION') {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE estado_tramite = 'APROBADA')::int AS total,
        0::int AS pending,
        COUNT(*) FILTER (WHERE estado_tramite = 'APROBADA')::int AS approved,
        0::int AS denied,
        0::int AS pending_over_24h
      FROM incapacidades
    `);
    return response.json(result.rows[0]);
  }

  // REVIEWER ve solo su zona (aprobadas y denegadas)
  const zona = user.zonaAsignada ?? '';
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE i.estado_tramite IN ('APROBADA', 'DENEGADA'))::int AS total,
       0::int AS pending,
       COUNT(*) FILTER (WHERE i.estado_tramite = 'APROBADA')::int AS approved,
       COUNT(*) FILTER (WHERE i.estado_tramite = 'DENEGADA')::int AS denied,
       0::int AS pending_over_24h
     FROM incapacidades i
     LEFT JOIN perfil_empleado p ON p.chat_id = i.chat_id
     WHERE (p.zona_area = $1 OR p.zona_spt = $1)`,
    [zona],
  );
  response.json(result.rows[0]);
});

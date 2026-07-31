import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (_request, response) => {
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
  response.json(result.rows[0]);
});

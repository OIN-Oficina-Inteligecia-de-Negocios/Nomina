import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import {
  decideIncapacity,
  detailSelect,
  getIncapacity,
} from '../services/incapacityService.js';

export const incapacidadesRouter = Router();
incapacidadesRouter.use(requireAuth);

const idSchema = z.coerce.number().int().positive();

incapacidadesRouter.get('/', async (request, response) => {
  const query = z
    .object({
      search: z.string().trim().max(100).default(''),
      status: z
        .enum(['TODAS', 'PENDIENTE_REVISION', 'APROBADA', 'DENEGADA'])
        .default('TODAS'),
      type: z.string().trim().max(100).default(''),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(request.query);

  const where: string[] = [];
  const values: unknown[] = [];
  if (query.search) {
    values.push(`%${query.search}%`);
    where.push(`(
      CAST(i.id AS TEXT) ILIKE $${values.length}
      OR COALESCE(p.cedula, '') ILIKE $${values.length}
      OR COALESCE(p.nombre_completo, '') ILIKE $${values.length}
    )`);
  }
  if (query.status !== 'TODAS') {
    values.push(query.status);
    where.push(`i.estado_tramite = $${values.length}`);
  }
  if (query.type) {
    values.push(query.type);
    where.push(`i.tipo = $${values.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM incapacidades i
     LEFT JOIN perfil_empleado p ON p.chat_id = i.chat_id
     ${whereSql}`,
    values,
  );
  values.push(query.limit, (query.page - 1) * query.limit);
  const result = await pool.query(
    `${detailSelect}
     ${whereSql}
     ORDER BY
       CASE WHEN i.estado_tramite = 'PENDIENTE_REVISION' THEN 0 ELSE 1 END,
       i.fecha_creacion DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  response.json({
    items: result.rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count.rows[0].total,
      pages: Math.max(1, Math.ceil(count.rows[0].total / query.limit)),
    },
  });
});

incapacidadesRouter.get('/:id/document', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const item = await getIncapacity(id);
  if (!item.url_documento) {
    throw new AppError('Este radicado no tiene un documento asociado', 404, 'DOCUMENT_NOT_FOUND');
  }

  let storedUrl: URL;
  try {
    storedUrl = new URL(item.url_documento);
  } catch {
    throw new AppError('La URL del documento no es válida', 422, 'INVALID_DOCUMENT_URL');
  }

  const allowedHosts = new Set(['10.151.12.6', 'localhost', '127.0.0.1']);
  if (!allowedHosts.has(storedUrl.hostname) || !storedUrl.pathname.startsWith('/incapacidades/')) {
    throw new AppError('La ubicación del documento no está permitida', 422, 'INVALID_DOCUMENT_URL');
  }

  const localStorageUrl = `http://127.0.0.1:53003${storedUrl.pathname}${storedUrl.search}`;
  let storageResponse: globalThis.Response;
  try {
    storageResponse = await fetch(localStorageUrl, { signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new AppError('No fue posible conectar con el almacenamiento de documentos', 502, 'STORAGE_UNAVAILABLE');
  }
  if (!storageResponse.ok) {
    throw new AppError('No fue posible descargar el documento', 502, 'DOCUMENT_DOWNLOAD_FAILED');
  }

  const storedBytes = Buffer.from(await storageResponse.arrayBuffer());
  const pdfStart = storedBytes.indexOf(Buffer.from('%PDF-'));
  const pdfEndMarker = storedBytes.lastIndexOf(Buffer.from('%%EOF'));
  if (pdfStart < 0 || pdfEndMarker < pdfStart) {
    throw new AppError('El archivo almacenado no contiene un PDF válido', 422, 'INVALID_PDF');
  }

  const pdfBytes = storedBytes.subarray(pdfStart, pdfEndMarker + 5);
  const fileName = String(item.nombre_archivo || `Incapacidad-${id}.pdf`)
    .replace(/[\r\n"\\]/g, '_');
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  response.setHeader('Content-Length', String(pdfBytes.length));
  response.send(pdfBytes);
});
incapacidadesRouter.get('/:id', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const [item, history] = await Promise.all([
    getIncapacity(id),
    pool.query(
      `SELECT id, action, observation, reviewer_email, created_at
       FROM approval_history WHERE incapacidad_id = $1
       ORDER BY created_at DESC`,
      [id],
    ),
  ]);
  response.json({ item, history: history.rows });
});

incapacidadesRouter.post('/:id/approve', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const item = await decideIncapacity({
    id,
    action: 'APROBADA',
    reviewerEmail: request.user!.email,
  });
  response.json({ item });
});

incapacidadesRouter.post('/:id/deny', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const { observation } = z
    .object({
      observation: z
        .string()
        .trim()
        .min(5, 'La observación debe tener al menos 5 caracteres')
        .max(1000),
    })
    .parse(request.body);

  const item = await decideIncapacity({
    id,
    action: 'DENEGADA',
    observation,
    reviewerEmail: request.user!.email,
  });
  response.json({ item });
});

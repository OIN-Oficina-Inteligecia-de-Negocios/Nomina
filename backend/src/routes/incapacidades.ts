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

function buildIncapacidadesWhere(
  user: { role: string; zonaAsignada?: string | null },
  query: { search?: string; status?: string; type?: string },
) {
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

  if (query.type) {
    values.push(query.type);
    where.push(`i.tipo = $${values.length}`);
  }

  // Filtrado según ROL
  if (user.role === 'ADMIN') {
    if (query.status && query.status !== 'TODAS') {
      values.push(query.status);
      where.push(`i.estado_tramite = $${values.length}`);
    }
  } else if (user.role === 'GESTION') {
    // GESTION: solo ve APROBADAS de todas las zonas
    where.push(`i.estado_tramite = 'APROBADA'`);
  } else {
    // REVIEWER: solo ve APROBADAS y DENEGADAS de su zona asignada
    if (query.status === 'APROBADA' || query.status === 'DENEGADA') {
      values.push(query.status);
      where.push(`i.estado_tramite = $${values.length}`);
    } else {
      where.push(`i.estado_tramite IN ('APROBADA', 'DENEGADA')`);
    }

    const zona = user.zonaAsignada || '';
    values.push(zona);
    where.push(`(p.zona_area = $${values.length} OR p.zona_spt = $${values.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { whereSql, values };
}

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

  const { whereSql, values } = buildIncapacidadesWhere(request.user!, query);

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM incapacidades i
     LEFT JOIN perfil_empleado p ON p.chat_id = i.chat_id
     ${whereSql}`,
    values,
  );

  const queryValues = [...values, query.limit, (query.page - 1) * query.limit];
  const result = await pool.query(
    `${detailSelect}
     ${whereSql}
     ORDER BY
       CASE WHEN i.estado_tramite = 'PENDIENTE_REVISION' THEN 0 ELSE 1 END,
       i.fecha_creacion DESC
     LIMIT $${queryValues.length - 1} OFFSET $${queryValues.length}`,
    queryValues,
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

incapacidadesRouter.get('/export', async (request, response) => {
  const query = z
    .object({
      search: z.string().trim().max(100).default(''),
      status: z
        .enum(['TODAS', 'PENDIENTE_REVISION', 'APROBADA', 'DENEGADA'])
        .default('TODAS'),
      type: z.string().trim().max(100).default(''),
    })
    .parse(request.query);

  const { whereSql, values } = buildIncapacidadesWhere(request.user!, query);

  const exportQuery = `
    SELECT
      i.id,
      i.chat_id,
      i.tipo,
      i.datos,
      i.estado_tramite,
      i.url_documento,
      i.nombre_archivo,
      i.fecha_creacion,
      i.fecha_actualizacion,
      p.cedula,
      p.nombre_completo,
      COALESCE(p.eps_nombre, p.eps) AS eps,
      p.eps_nombre,
      COALESCE(p.zona_area, p.zona_spt) AS zona_area,
      ah.action AS ultima_decision,
      ah.observation AS ultima_observacion,
      ah.reviewer_email AS revisor_email,
      ah.created_at AS fecha_decision
    FROM incapacidades i
    LEFT JOIN perfil_empleado p ON p.chat_id = i.chat_id
    LEFT JOIN LATERAL (
      SELECT action, observation, reviewer_email, created_at
      FROM approval_history
      WHERE incapacidad_id = i.id
      ORDER BY created_at DESC
      LIMIT 1
    ) ah ON TRUE
  `;

  const result = await pool.query(
    `${exportQuery}
     ${whereSql}
     ORDER BY i.fecha_creacion DESC
     LIMIT 5000`,
    values,
  );

  const host = request.get('host') || '10.151.12.133:3006';
  const protocol = request.protocol || 'http';
  const baseUrl = `${protocol}://${host}`;

  const userToken =
    request.headers.authorization?.replace(/^Bearer\s+/i, '') ||
    (typeof request.query.token === 'string' ? request.query.token : '');

  const formatField = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const formatDate = (val: unknown) => {
    if (!val) return '""';
    try {
      const d = new Date(String(val));
      if (isNaN(d.getTime())) return formatField(val);
      return formatField(
        d.toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      );
    } catch {
      return formatField(val);
    }
  };

  const headers = [
    'Radicado',
    'Cédula',
    'Nombre Colaborador',
    'EPS',
    'EPS Detallada',
    'Zona / Área',
    'Teléfono / Chat ID',
    'Tipo Incapacidad',
    'Estado del Trámite',
    '¿Aprobado?',
    'Fecha Inicio Incapacidad',
    'Fecha Fin Incapacidad',
    'Observaciones Solicitud',
    'Fecha Registro',
    'Fecha Última Actualización',
    'Nombre Archivo Consolidado',
    'Link Consolidado (PDF)',
    'Motivo / Observación Decisión',
    'Revisor Responsable',
    'Fecha Decisión',
  ];

  const rows = result.rows.map((r: Record<string, unknown>) => {
    const datos = (r.datos as Record<string, unknown>) || {};
    const linkConsolidado = r.url_documento
      ? `${baseUrl}/api/incapacidades/${r.id}/document${userToken ? `?token=${encodeURIComponent(userToken)}` : ''}`
      : '';

    const estado = String(r.estado_tramite || '');
    const fueAprobado =
      estado === 'APROBADA'
        ? 'SÍ'
        : estado === 'DENEGADA'
          ? 'NO'
          : 'PENDIENTE';

    const observaciones = datos.observaciones ?? datos.observacion ?? '';

    return [
      formatField(r.id),
      formatField(r.cedula),
      formatField(r.nombre_completo),
      formatField(r.eps),
      formatField(r.eps_nombre),
      formatField(r.zona_area),
      formatField(r.chat_id),
      formatField(r.tipo),
      formatField(r.estado_tramite),
      formatField(fueAprobado),
      formatField(datos.fecha_inicio ?? ''),
      formatField(datos.fecha_fin ?? ''),
      formatField(observaciones),
      formatDate(r.fecha_creacion),
      formatDate(r.fecha_actualizacion),
      formatField(r.nombre_archivo),
      formatField(linkConsolidado),
      formatField(r.ultima_observacion),
      formatField(r.revisor_email),
      formatDate(r.fecha_decision),
    ];
  });

  const csvContent =
    '\uFEFF' + [headers.join(';'), ...rows.map((row: string[]) => row.join(';'))].join('\r\n');

  const filename = `Reporte_Incapacidades_${new Date().toISOString().slice(0, 10)}.csv`;

  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.send(csvContent);
});

incapacidadesRouter.get('/:id/document', async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const item = await getIncapacity(id);
  if (!item.url_documento) {
    throw new AppError('Este radicado no tiene un documento asociado', 404, 'DOCUMENT_NOT_FOUND');
  }

  let storedPath = '';
  let storedSearch = '';
  let originalHostName = '';
  let originalPort = '';
  try {
    const parsed = new URL(item.url_documento);
    storedPath = parsed.pathname;
    storedSearch = parsed.search;
    originalHostName = parsed.hostname;
    originalPort = parsed.port;
  } catch {
    storedPath = item.url_documento.startsWith('/')
      ? item.url_documento
      : '/' + item.url_documento.replace(/^http:\/\/[^/]+/, '');
  }

  const rawHost = request.get('host') || '10.151.12.133';
  const requestHostIp = rawHost.split(':')[0];

  const hostCandidates = Array.from(
    new Set([
      requestHostIp,
      originalHostName,
      '10.151.12.133',
      '10.151.12.6',
      'host.docker.internal',
      'localhost',
      '127.0.0.1',
      'minio',
    ].filter(Boolean))
  );

  const portsToTry = Array.from(
    new Set([originalPort, '53003', '3000', '3003', '9000', '8080', '9001', '80', ''].filter((p) => p !== undefined))
  );

  const candidateUrls: string[] = [];

  if (item.url_documento.startsWith('http')) {
    candidateUrls.push(item.url_documento);
  }

  for (const h of hostCandidates) {
    for (const p of portsToTry) {
      const portSuffix = p ? `:${p}` : '';
      candidateUrls.push(`http://${h}${portSuffix}${storedPath}${storedSearch}`);
    }
  }

  const uniqueCandidates = Array.from(new Set(candidateUrls));

  let validBuffer: Buffer | null = null;
  let detectedContentType = '';
  const attemptedLogs: string[] = [];

  for (const url of uniqueCandidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        attemptedLogs.push(`${url} => HTTP status ${res.status}`);
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);

      // Verify if response is XML Error / HTML Error instead of the requested binary
      const sample = buf.toString('utf-8', 0, 300);
      if (sample.includes('<Error') || sample.includes('<?xml') || sample.toLowerCase().includes('<!doctype html')) {
        attemptedLogs.push(`${url} => HTTP 200 pero devolvió XML/HTML de error`);
        continue;
      }

      validBuffer = buf;
      detectedContentType = res.headers.get('content-type') || '';
      attemptedLogs.push(`${url} => ÉXITO (${buf.length} bytes)`);
      break;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      attemptedLogs.push(`${url} => FALLÓ (${errMsg})`);
    }
  }

  if (!validBuffer) {
    response.status(502).type('html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error al descargar documento #${id}</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #111827; color: #f9fafb; padding: 40px; line-height: 1.6; }
            .card { max-width: 850px; margin: 0 auto; background: #1f2937; padding: 30px; border-radius: 12px; border: 1px solid #374151; }
            h2 { color: #f87171; margin-top: 0; }
            code { background: #111827; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-size: 0.9em; }
            pre { background: #111827; padding: 15px; border-radius: 8px; overflow-x: auto; color: #9ca3af; font-size: 0.85em; max-height: 300px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>No fue posible obtener el documento consolidado (#${id})</h2>
            <p><strong>URL registrada en BD:</strong> <code>${item.url_documento}</code></p>
            <p>El backend intentó descargar el archivo probando los siguientes servidores de almacenamiento (MinIO / Proxy):</p>
            <pre>${attemptedLogs.join('\n')}</pre>
            <p><small>Verifica cuál de estos servicios o puertos contiene el archivo en el servidor.</small></p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  const rawFileName = String(item.nombre_archivo || storedPath.split('/').pop() || `Incapacidad-${id}.pdf`);
  const lowerName = rawFileName.toLowerCase();
  const lowerPath = storedPath.toLowerCase();

  let finalContentType = 'application/pdf';
  if (lowerName.endsWith('.png') || lowerPath.endsWith('.png')) {
    finalContentType = 'image/png';
  } else if (
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerPath.endsWith('.jpg') ||
    lowerPath.endsWith('.jpeg')
  ) {
    finalContentType = 'image/jpeg';
  } else if (detectedContentType && !detectedContentType.includes('application/octet-stream')) {
    finalContentType = detectedContentType;
  }

  const safeFileName = rawFileName.replace(/[\r\n"\\]/g, '_');

  response.setHeader('Content-Type', finalContentType);
  response.setHeader(
    'Content-Disposition',
    `inline; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
  );
  response.setHeader('Content-Length', String(validBuffer.length));
  response.setHeader('Cache-Control', 'public, max-age=3600');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.send(validBuffer);
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

  const user = request.user!;
  if (user.role === 'GESTION') {
    if (item.estado_tramite !== 'APROBADA') {
      throw new AppError('No tienes acceso a solicitudes no aprobadas', 403, 'FORBIDDEN');
    }
  } else if (user.role !== 'ADMIN') {
    if (!['APROBADA', 'DENEGADA'].includes(item.estado_tramite)) {
      throw new AppError('No tienes acceso a solicitudes pendientes', 403, 'FORBIDDEN');
    }
    if (item.zona_area !== user.zonaAsignada) {
      throw new AppError('No tienes acceso a los registros de esta zona', 403, 'FORBIDDEN');
    }
  }

  response.json({ item, history: history.rows });
});

incapacidadesRouter.post('/:id/approve', async (request, response) => {
  if (request.user!.role !== 'ADMIN') {
    throw new AppError('No tienes permisos para realizar esta acción', 403, 'FORBIDDEN');
  }
  const id = idSchema.parse(request.params.id);
  const item = await decideIncapacity({
    id,
    action: 'APROBADA',
    reviewerEmail: request.user!.email,
  });
  response.json({ item });
});

incapacidadesRouter.post('/:id/deny', async (request, response) => {
  if (request.user!.role !== 'ADMIN') {
    throw new AppError('No tienes permisos para realizar esta acción', 403, 'FORBIDDEN');
  }
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

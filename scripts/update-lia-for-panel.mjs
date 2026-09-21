import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workflowPath = '/home/juan.monroy/Incapacidades.json';
const panelBaseUrl = String(process.argv[2] || 'http://localhost:5173')
  .trim()
  .replace(/\/+$/, '');

if (!/^https?:\/\/[^/]+/i.test(panelBaseUrl)) {
  throw new Error(
    'La URL del panel debe iniciar con http:// o https://. Ejemplo: http://localhost:5173',
  );
}

if (!fs.existsSync(workflowPath)) {
  throw new Error(`No se encontró el archivo del flujo en: ${workflowPath}`);
}

const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const requiredNodes = [
  'Configurar revisión por correo',
  'Guardar token y estado de revisión',
  'Outlook - Solicitud pendiente de revisión',
];

for (const name of requiredNodes) {
  if (!workflow.nodes.some((node) => node.name === name)) {
    throw new Error(`No se encontró el nodo requerido: ${name}`);
  }
}

const obsoleteNodes = new Set([
  'Marcar incapacidad aprobada',
  'Preparar correo de escalamiento',
  'Outlook - Escalar incapacidad aprobada',
  'WhatsApp - Incapacidad aprobada',
  'Obtener incapacidad a denegar',
  'Validar denegación y observación',
  '¿Denegación válida?',
  'Marcar incapacidad denegada',
  'WhatsApp - Incapacidad denegada',
  'Obtener perfil para escalamiento',
  'Obtener incapacidad a aprobar',
  'Validar aprobación confirmada',
  '¿Aprobación confirmada válida?',
  'Outlook Trigger - Respuestas de aprobación',
  'Interpretar respuesta de Outlook',
  'Enrutar respuesta Outlook',
  'Outlook - Aprobación no procesada',
  'Outlook - Denegación no procesada',
]);

const rename = new Map([
  ['Configurar revisión por correo', 'Preparar notificación para panel'],
  ['Guardar token y estado de revisión', 'Guardar estado pendiente de revisión'],
  [
    'Outlook - Solicitud pendiente de revisión',
    'Outlook - Notificar nueva incapacidad',
  ],
]);

workflow.nodes = workflow.nodes.filter((node) => !obsoleteNodes.has(node.name));

const prepareNode = workflow.nodes.find(
  (node) => node.name === 'Configurar revisión por correo',
);
prepareNode.name = rename.get(prepareNode.name);
prepareNode.notes =
  'Prepara el aviso de registro y el enlace al panel. No genera acciones por correo.';
prepareNode.parameters.jsCode = `
const solicitud = $input.first().json;
const raw = $('GET Incapacidad Final').item.json;
const rec = Array.isArray(raw) ? (raw[0] || {}) : (raw || {});
const panelBaseUrl = ${JSON.stringify(panelBaseUrl)};
const panelUrl = panelBaseUrl + '/incapacidades/' + solicitud.inc_id;
const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const datosRevision = {
  ...(rec.datos || {}),
  approval_status: 'PENDIENTE_REVISION',
  review_channel: 'PANEL_LIA',
  review_requested_at: new Date().toISOString()
};

const htmlNotificacion =
  '<div style="font-family:Arial,sans-serif;max-width:720px;color:#1f2937">' +
  '<h2 style="color:#164e63">Nueva incapacidad registrada</h2>' +
  '<p>Se registró una nueva solicitud y ya está disponible en el panel de revisión.</p>' +
  '<table style="border-collapse:collapse;width:100%">' +
  '<tr><td style="padding:7px;border:1px solid #ddd"><b>Radicado</b></td><td style="padding:7px;border:1px solid #ddd">#' + esc(solicitud.inc_id) + '</td></tr>' +
  '<tr><td style="padding:7px;border:1px solid #ddd"><b>Empleado</b></td><td style="padding:7px;border:1px solid #ddd">' + esc(solicitud.nombre_completo) + '</td></tr>' +
  '<tr><td style="padding:7px;border:1px solid #ddd"><b>Cédula</b></td><td style="padding:7px;border:1px solid #ddd">' + esc(solicitud.cedula) + '</td></tr>' +
  '<tr><td style="padding:7px;border:1px solid #ddd"><b>EPS</b></td><td style="padding:7px;border:1px solid #ddd">' + esc(solicitud.eps) + '</td></tr>' +
  '<tr><td style="padding:7px;border:1px solid #ddd"><b>Correo jefe inmediato</b></td><td style="padding:7px;border:1px solid #ddd">' + esc(solicitud.jefe_inmediato) + '</td></tr>' +
  '<tr><td style="padding:7px;border:1px solid #ddd"><b>Área / Zona</b></td><td style="padding:7px;border:1px solid #ddd">' + esc(solicitud.zona_area) + '</td></tr>' +
  '<tr><td style="padding:7px;border:1px solid #ddd"><b>Tipo</b></td><td style="padding:7px;border:1px solid #ddd">' + esc(solicitud.label) + '</td></tr>' +
  '<tr><td style="padding:7px;border:1px solid #ddd"><b>Período</b></td><td style="padding:7px;border:1px solid #ddd">' + esc(solicitud.fecha_inicio) + ' — ' + esc(solicitud.fecha_fin) + '</td></tr>' +
  '</table>' +
  '<p style="margin-top:18px"><a href="' + esc(rec.url_documento || '') + '" style="color:#0369a1;font-weight:bold">Abrir PDF consolidado</a></p>' +
  '<p style="margin-top:26px"><a href="' + esc(panelUrl) + '" style="display:inline-block;padding:12px 22px;background:#155e50;color:white;text-decoration:none;border-radius:6px">Revisar en el panel</a></p>' +
  '<p style="margin-top:22px;font-size:12px;color:#6b7280">La aprobación o denegación debe realizarse únicamente desde el panel.</p>' +
  '</div>';

return [{ json: {
  ...solicitud,
  url_documento: rec.url_documento || '',
  nombre_archivo: rec.nombre_archivo || '',
  panel_url: panelUrl,
  datos_revision: datosRevision,
  html_notificacion: htmlNotificacion
} }];
`.trim();

const saveNode = workflow.nodes.find(
  (node) => node.name === 'Guardar token y estado de revisión',
);
saveNode.name = rename.get(saveNode.name);
saveNode.notes =
  'Deja el radicado disponible para decisión exclusiva desde el panel.';
saveNode.parameters.url =
  "=http://postgrest:3000/incapacidades?id=eq.{{ $('Preparar notificación para panel').item.json.inc_id }}";
saveNode.parameters.bodyParameters = {
  parameters: [
    {
      name: 'estado_tramite',
      value: 'PENDIENTE_REVISION',
    },
    {
      name: 'datos',
      value:
        "={{ $('Preparar notificación para panel').item.json.datos_revision }}",
    },
  ],
};

const emailNode = workflow.nodes.find(
  (node) => node.name === 'Outlook - Solicitud pendiente de revisión',
);
emailNode.name = rename.get(emailNode.name);
emailNode.notes =
  'Solo informa el registro y dirige al panel; no contiene acciones de aprobación por correo.';
emailNode.parameters.subject =
  "={{ 'Nueva incapacidad registrada #' + $('Preparar notificación para panel').item.json.inc_id }}";
emailNode.parameters.bodyContent =
  "={{ $('Preparar notificación para panel').item.json.html_notificacion }}";

const updatedConnections = {};
for (const [sourceName, connectionTypes] of Object.entries(
  workflow.connections,
)) {
  if (obsoleteNodes.has(sourceName)) continue;
  const updatedSource = rename.get(sourceName) || sourceName;
  const updatedTypes = {};

  for (const [type, outputs] of Object.entries(connectionTypes)) {
    updatedTypes[type] = outputs.map((output) =>
      (output || [])
        .filter((connection) => !obsoleteNodes.has(connection.node))
        .map((connection) => ({
          ...connection,
          node: rename.get(connection.node) || connection.node,
        })),
    );
  }
  updatedConnections[updatedSource] = updatedTypes;
}
workflow.connections = updatedConnections;

const existingNames = new Set(workflow.nodes.map((node) => node.name));
const invalidConnections = [];
for (const [sourceName, connectionTypes] of Object.entries(
  workflow.connections,
)) {
  if (!existingNames.has(sourceName)) {
    invalidConnections.push(`Origen inexistente: ${sourceName}`);
  }
  for (const outputs of Object.values(connectionTypes)) {
    for (const output of outputs) {
      for (const connection of output || []) {
        if (!existingNames.has(connection.node)) {
          invalidConnections.push(
            `Destino inexistente: ${sourceName} -> ${connection.node}`,
          );
        }
      }
    }
  }
}

if (invalidConnections.length) {
  throw new Error(invalidConnections.join('\n'));
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `/home/juan.monroy/Incapacidades.backup-antes-integrar-panel-${timestamp}.json`;
fs.copyFileSync(workflowPath, backupPath);
fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');

console.log(`Flujo actualizado: ${workflowPath}`);
console.log(`Copia de seguridad: ${backupPath}`);
console.log(`URL configurada para el panel: ${panelBaseUrl}`);
console.log(`Nodos retirados del circuito anterior: ${obsoleteNodes.size}`);
console.log(`Nodos actuales: ${workflow.nodes.length}`);

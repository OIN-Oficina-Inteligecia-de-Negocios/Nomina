import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const workflowPath = path.join(root, 'LIA.json');
const backupPath = path.join(root, 'LIA.backup-antes-eliminar-monitores-y-avisos-2026-07-29.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(workflowPath, backupPath);
}

const removedNames = new Set([
  'Monitor de inactividad por conversación',
  'Calcular corte inactividad',
  'Buscar sesiones inactivas',
  'Separar sesiones inactivas',
  'Monitor decisiones del panel',
  'Buscar decisiones pendientes de notificar',
  'Separar decisiones pendientes',
  'Consultar sesión de decisión',
  'Preparar notificación de decisión',
  'WhatsApp - Notificar decisión finalizada',
  'Recuperar decisión después de WhatsApp',
  'Switch resultado de decisión',
  'Outlook - Confirmar aprobación',
  'Recuperar decisión después de Outlook',
  'Marcar decisión notificada',
  'Capturar control de inactividad',
  'Esperar inactividad de conversación',
  'Consultar sesión tras espera',
  'Validar inactividad de conversación',
]);

workflow.nodes = workflow.nodes.filter((node) => !removedNames.has(node.name));

for (const source of Object.keys(workflow.connections)) {
  if (removedNames.has(source)) {
    delete workflow.connections[source];
    continue;
  }
  const outputs = workflow.connections[source];
  for (const outputType of Object.keys(outputs)) {
    outputs[outputType] = outputs[outputType].map((branch) =>
      branch.filter((connection) => !removedNames.has(connection.node)),
    );
  }
}

const activeStates = [
  'SELECCIONAR_INCAPACIDAD', 'CONFIRMAR_PERFIL', 'ESPERANDO_CEDULA', 'ESPERANDO_NOMBRE',
  'ESPERANDO_EPS', 'ESPERANDO_JEFE', 'ESPERANDO_ZONA', 'ACT_ESPERANDO_CEDULA',
  'ACT_ESPERANDO_NOMBRE', 'ACT_ESPERANDO_EPS', 'ACT_ESPERANDO_JEFE', 'ACT_ESPERANDO_ZONA',
  'ESPERANDO_FECHA_INICIO', 'ESPERANDO_FECHA_FIN', 'ESPERANDO_RESP_FORMATO_INV',
  'ESPERANDO_CONFIRMACION_FORMATO_DILIGENCIADO', 'ESPERANDO_DOC_ENFERMEDAD_REINTENTAR',
  'ESPERANDO_DOC_ENFERMEDAD_FORMATO_INCAPACIDAD', 'ESPERANDO_DOC_MATERNIDAD_FORMATO_MATERNIDAD',
  'ESPERANDO_DOC_MATERNIDAD_CERT_GESTACION', 'ESPERANDO_DOC_MATERNIDAD_REGISTRO_CIVIL',
  'ESPERANDO_DOC_PATERNIDAD_REGISTRO_CIVIL', 'ESPERANDO_DOC_PATERNIDAD_FORMATO_MAT_CONYUGE',
  'ESPERANDO_DOC_PATERNIDAD_CERT_GESTACION', 'ESPERANDO_DOC_TRANSITO_FORMATO_INCAPACIDAD',
  'ESPERANDO_DOC_TRANSITO_SOAT', 'ESPERANDO_DOC_TRANSITO_FURIPS',
  'ESPERANDO_DOC_TRANSITO_FMT_FORMATO_INCAPACIDAD', 'ESPERANDO_DOC_TRANSITO_FMT_FORMATO_INVESTIGACION',
  'ESPERANDO_DOC_TRANSITO_FMT_SOAT', 'ESPERANDO_DOC_TRANSITO_FMT_FURIPS',
  'ESPERANDO_DOC_TRABAJO_FORMATO_ARL',
];

workflow.nodes.push(
  {
    parameters: {
      jsCode: "const mensaje = $('Extraer Datos').item.json;\nreturn [{ json: { chat_id: mensaje.chat_id, message_id: String(mensaje.message_id || '') } }];",
    },
    id: 'a72d5a67-9e1d-46f4-8f53-9b2090759a01',
    name: 'Capturar control de inactividad',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-1120, 120],
  },
  {
    parameters: { amount: 2, unit: 'minutes' },
    id: 'b83e6b78-af2e-4705-9064-ac31a186ab12',
    name: 'Esperar inactividad de conversación',
    type: 'n8n-nodes-base.wait',
    typeVersion: 1.1,
    position: [-896, 120],
    webhookId: 'f1c4e866-ea5f-4a1f-9aa0-9d87d4408c64',
  },
  {
    parameters: {
      url: '=http://postgrest:3000/estados_sesion?chat_id=eq.{{$json.chat_id}}&select=chat_id,estado,last_message_id&limit=1',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'Content-Type', value: 'application/json' },
      ] },
      options: {},
    },
    id: 'c94f7c89-b03f-4816-a175-bd42b297bc23',
    name: 'Consultar sesión tras espera',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [-672, 120],
  },
  {
    parameters: {
      jsCode: `const control = $('Capturar control de inactividad').item.json;\nconst respuesta = $input.first()?.json;\nconst sesion = Array.isArray(respuesta) ? (respuesta[0] || {}) : (respuesta || {});\nconst estadosActivos = ${JSON.stringify(activeStates)};\nconst mismoMensaje = String(sesion.last_message_id || '') === String(control.message_id || '');\nif (!sesion.chat_id || !mismoMensaje || !estadosActivos.includes(sesion.estado)) return [];\nreturn [{ json: { ...control, estado: sesion.estado } }];`,
    },
    id: 'd0508d9a-c140-4927-b286-ce53c3a8cd34',
    name: 'Validar inactividad de conversación',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-448, 120],
  },
);

const finalizer = workflow.nodes.find((node) => node.name === 'Finalizar sesión inactiva');
if (!finalizer) throw new Error('No se encontró el nodo Finalizar sesión inactiva');
const stateFilter = activeStates.join(',');
finalizer.parameters.url = `=http://postgrest:3000/estados_sesion?chat_id=eq.{{$json.chat_id}}&last_message_id=eq.{{encodeURIComponent($json.message_id)}}&estado=in.(${stateFilter})`;
finalizer.parameters.sendHeaders = true;
finalizer.parameters.headerParameters = { parameters: [
  { name: 'Content-Type', value: 'application/json' },
  { name: 'Prefer', value: 'return=representation' },
] };
finalizer.parameters.sendBody = true;
finalizer.parameters.contentType = 'raw';
finalizer.parameters.rawContentType = 'application/json';
finalizer.parameters.body = "={{ JSON.stringify({ estado: 'FINALIZADA', tipo_incapacidad_actual: null, updated_at: $now.toISO() }) }}";

const connect = (source, target) => {
  workflow.connections[source] = { main: [[{ node: target, type: 'main', index: 0 }]] };
};

const saveConnections = workflow.connections['Guardar Message ID'];
if (!saveConnections?.main?.[0]) throw new Error('No se encontró la conexión de Guardar Message ID');
if (!saveConnections.main[0].some((connection) => connection.node === 'Capturar control de inactividad')) {
  saveConnections.main[0].push({ node: 'Capturar control de inactividad', type: 'main', index: 0 });
}
connect('Capturar control de inactividad', 'Esperar inactividad de conversación');
connect('Esperar inactividad de conversación', 'Consultar sesión tras espera');
connect('Consultar sesión tras espera', 'Validar inactividad de conversación');
connect('Validar inactividad de conversación', 'Finalizar sesión inactiva');
connect('Finalizar sesión inactiva', 'Confirmar sesiones finalizadas');
connect('Confirmar sesiones finalizadas', 'Mensaje cierre por inactividad');

fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  backup: backupPath,
  nodes: workflow.nodes.length,
  schedules: workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.scheduleTrigger').length,
  statusNotificationNodes: workflow.nodes.filter((node) => /decisi[oó]n|Confirmar aprobaci[oó]n|Notificar decisi[oó]n/i.test(node.name)).map((node) => node.name),
}, null, 2));
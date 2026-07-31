import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(here, '..', '..', 'LIA.json');
const backupPath = path.resolve(here, '..', '..', 'LIA.backup-antes-conversaciones-notificaciones-links-2026-07-29.json');
const workflow = JSON.parse(await readFile(workflowPath, 'utf8'));

const getNode = (name) => {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  if (!node) throw new Error(`No existe el nodo: ${name}`);
  return node;
};

const addNode = (node) => {
  if (workflow.nodes.some((candidate) => candidate.name === node.name)) {
    throw new Error(`Ya existe el nodo nuevo: ${node.name}`);
  }
  workflow.nodes.push(node);
};

const renameNode = (oldName, newName) => {
  const node = getNode(oldName);
  node.name = newName;
  if (workflow.connections[oldName]) {
    workflow.connections[newName] = workflow.connections[oldName];
    delete workflow.connections[oldName];
  }
  for (const groups of Object.values(workflow.connections)) {
    for (const outputs of Object.values(groups)) {
      for (const branch of outputs) {
        for (const connection of branch) {
          if (connection.node === oldName) connection.node = newName;
        }
      }
    }
  }
  return node;
};

const stringRule = (id, value, outputKey = value) => ({
  conditions: {
    options: {
      caseSensitive: true,
      leftValue: '',
      typeValidation: 'strict',
      version: 2,
    },
    conditions: [{
      id,
      leftValue: '={{ $json.ruta }}',
      rightValue: value,
      operator: {
        type: 'string',
        operation: 'equals',
        name: 'filter.operator.equals',
      },
    }],
    combinator: 'and',
  },
  renameOutput: true,
  outputKey,
});

// 1. Cada entrada actualiza explícitamente la actividad de su propia conversación.
const saveMessage = getNode('Guardar Message ID');
const saveParameters = saveMessage.parameters.bodyParameters.parameters;
if (!saveParameters.some((parameter) => parameter.name === 'updated_at')) {
  saveParameters.push({ name: 'updated_at', value: '={{ $now.toISO() }}' });
}

// 2. Detectar respuestas citadas o botones antiguos cuando la conversación ya terminó.
const extract = getNode('Extraer Datos');
extract.parameters.jsCode = extract.parameters.jsCode.replace(
  "const message_id = waMsg?.id || '';",
  "const message_id = waMsg?.id || '';\nconst context_message_id = waMsg?.context?.id || '';\nconst es_respuesta_anterior = Boolean(context_message_id) || waMsg?.type === 'interactive';",
);
extract.parameters.jsCode = extract.parameters.jsCode.replace(
  '  message_id,\n  chat_id,',
  '  message_id,\n  context_message_id,\n  es_respuesta_anterior,\n  chat_id,',
);

const router = getNode('Router');
router.parameters.jsCode = router.parameters.jsCode.replace(
  "let ruta = 'MOSTRAR_MENU';\n\nif (debe_resetear)",
  "const es_respuesta_anterior = Boolean(chat.es_respuesta_anterior);\nlet ruta = 'MOSTRAR_MENU';\n\nif (estado === 'FINALIZADA' && es_respuesta_anterior) ruta = 'IGNORAR';\nelse if (estado === 'FINALIZADA')                     ruta = 'REINICIAR_CONVERSACION';\nelse if (debe_resetear)",
);

const mainSwitch = getNode('Switch Principal');
mainSwitch.parameters.rules.values.push(
  stringRule('r-reiniciar-conversacion', 'REINICIAR_CONVERSACION'),
);
workflow.connections['Switch Principal'].main.push([
  { node: 'Reset Estado antes de Menú', type: 'main', index: 0 },
]);

// 3. El scheduler solo busca candidatos; cada sesión se cierra con control de concurrencia.
renameNode('Monitor inactividad 2 min', 'Monitor de inactividad por conversación');
const inactivityCalculator = getNode('Calcular corte inactividad');
inactivityCalculator.parameters.jsCode = "const inactivityMinutes = 2;\nconst cutoff = new Date(Date.now() - inactivityMinutes * 60 * 1000).toISOString();\nreturn [{ json: { cutoff, inactivity_minutes: inactivityMinutes } }];";

const findInactive = renameNode('Cerrar sesiones inactivas', 'Buscar sesiones inactivas');
const activeStateFilter = findInactive.parameters.url;
findInactive.parameters = {
  url: activeStateFilter + '&select=chat_id,estado,updated_at',
  sendHeaders: true,
  headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
  options: {},
};
workflow.connections['Buscar sesiones inactivas'] = {
  main: [[{ node: 'Separar sesiones inactivas', type: 'main', index: 0 }]],
};
workflow.connections['Separar sesiones inactivas'] = {
  main: [[{ node: 'Finalizar sesión inactiva', type: 'main', index: 0 }]],
};

addNode({
  parameters: {
    method: 'PATCH',
    url: '=http://postgrest:3000/estados_sesion?chat_id=eq.{{$json.chat_id}}&updated_at=eq.{{encodeURIComponent($json.updated_at)}}',
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Prefer', value: 'return=representation' },
    ] },
    sendBody: true,
    bodyParameters: { parameters: [
      { name: 'estado', value: 'FINALIZADA' },
      { name: 'tipo_incapacidad_actual' },
      { name: 'updated_at', value: '={{ $now.toISO() }}' },
    ] },
    options: {},
  },
  id: '53b71e8c-1b94-4d76-bae6-d32511910c29',
  name: 'Finalizar sesión inactiva',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [65472, 35856],
});
addNode({
  parameters: {
    jsCode: "const rows = [];\nfor (const item of $input.all()) {\n  const value = item.json;\n  if (Array.isArray(value)) rows.push(...value);\n  else if (value?.chat_id) rows.push(value);\n}\nreturn rows.map((row) => ({ json: row }));",
  },
  id: '4cb38b9a-f762-479c-9f2e-00c4d69ed3cd',
  name: 'Confirmar sesiones finalizadas',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [65696, 35856],
});
workflow.connections['Finalizar sesión inactiva'] = {
  main: [[{ node: 'Confirmar sesiones finalizadas', type: 'main', index: 0 }]],
};
workflow.connections['Confirmar sesiones finalizadas'] = {
  main: [[{ node: 'Mensaje cierre por inactividad', type: 'main', index: 0 }]],
};
getNode('Mensaje cierre por inactividad').position = [65920, 35856];
getNode('Mensaje cierre por inactividad').parameters.body = '={"messaging_product":"whatsapp","to":"{{ $json.chat_id }}","type":"text","text":{"body":"⌛ *Conversación finalizada por falta de respuesta.*\\n\\nHan pasado más de 2 minutos sin actividad en esta conversación. Cuando desees iniciar nuevamente, envía un mensaje nuevo sin responder ni citar mensajes anteriores."}}';

// 4. MinIO conserva una URL interna para n8n y publica otra mediante el túnel local.
const metadata = getNode('Construir Metadata PDF');
metadata.parameters.jsCode = metadata.parameters.jsCode.replace(
  "const public_url   = 'http://10.151.12.6:3003/' + bucket_name + '/' + storage_path;",
  "const internal_url = 'http://minio:9000/' + bucket_name + '/' + storage_path;\nconst public_url   = 'http://localhost:53003/' + bucket_name + '/' + storage_path;",
).replace(
  '  public_url,\n  download_url',
  '  internal_url,\n  public_url,\n  download_url',
);

const accumulate = getNode('Acumular documentos');
accumulate.parameters.jsCode = accumulate.parameters.jsCode.replace(
  '  url: meta.public_url,',
  "  url: meta.internal_url || ('http://minio:9000/incapacidades/' + meta.storage_path),",
).replace(
  "const final_public_url = 'http://10.151.12.6:3003/incapacidades/' + final_storage_path;",
  "const final_public_url = 'http://localhost:53003/incapacidades/' + final_storage_path;",
);

// 5. Las decisiones del panel se notifican únicamente con la sesión FINALIZADA.
const whatsappCredentials = getNode('Mensaje cierre por inactividad').credentials;
const outlookTemplate = getNode('Outlook - Notificar nueva incapacidad');

addNode({
  parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } },
  id: '44d72073-e560-4f5c-9ea4-91c821cb5b7d',
  name: 'Monitor decisiones del panel',
  type: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1.2,
  position: [64576, 36496],
});
addNode({
  parameters: {
    url: '=http://postgrest:3000/incapacidades?estado_tramite=in.(APROBADA,DENEGADA)&select=id,chat_id,tipo,datos,estado_tramite,url_documento,nombre_archivo,fecha_creacion&order=fecha_creacion.asc&limit=100',
    sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
    options: {},
  },
  id: 'f04aac75-aa77-4aba-9238-614b0f7a986e',
  name: 'Buscar decisiones pendientes de notificar',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [64800, 36496],
});
addNode({
  parameters: {
    jsCode: "const rows = [];\nfor (const item of $input.all()) {\n  const value = item.json;\n  if (Array.isArray(value)) rows.push(...value);\n  else if (value?.id) rows.push(value);\n}\nreturn rows\n  .filter((row) => row.datos?.decision && !row.datos.decision.notificationSentAt)\n  .map((row) => ({ json: row }));",
  },
  id: '72cc80b1-909a-4f91-83a9-d558812b71f2',
  name: 'Separar decisiones pendientes',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [65024, 36496],
});
addNode({
  parameters: {
    url: '=http://postgrest:3000/estados_sesion?chat_id=eq.{{$json.chat_id}}&select=chat_id,estado&limit=1',
    sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
    options: {},
  },
  id: '43ec106e-00ba-4fca-a9ff-7b2680c5e109',
  name: 'Consultar sesión de decisión',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [65248, 36496],
});
addNode({
  parameters: {
    jsCode: `const incapacidad = $('Separar decisiones pendientes').item.json;
const rawSession = $input.first()?.json;
const session = Array.isArray(rawSession) ? (rawSession[0] || {}) : (rawSession || {});
if (session.estado !== 'FINALIZADA') return [];

const approved = incapacidad.estado_tramite === 'APROBADA';
const decision = incapacidad.datos?.decision || {};
const observation = String(decision.observation || '').trim();
const notificationSentAt = new Date().toISOString();
const whatsappMessage = approved
  ? 'ℹ️ *Aviso informativo*\\n\\n✅ Tu incapacidad con radicado #' + incapacidad.id + ' fue *aprobada*. El trámite continuará con el proceso interno correspondiente.'
  : 'ℹ️ *Aviso informativo*\\n\\n❌ Tu incapacidad con radicado #' + incapacidad.id + ' fue *denegada*.\\n\\n*Observación:* ' + (observation || 'No se registró una observación.') + '\\n\\nPara presentar nuevamente la solicitud, inicia una conversación nueva.';
const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const htmlDecision = '<div style="font-family:Arial,sans-serif;max-width:680px;color:#1f2937">' +
  '<h2 style="color:#164e63">Incapacidad aprobada</h2>' +
  '<p>La incapacidad con radicado <b>#' + esc(incapacidad.id) + '</b> fue aprobada desde el panel LIA.</p>' +
  '<p><b>Tipo:</b> ' + esc(incapacidad.tipo) + '</p>' +
  '<p><a href="http://localhost:5173/incapacidades/' + encodeURIComponent(incapacidad.id) + '">Consultar el radicado en el panel</a></p>' +
  '</div>';
const datosNotificados = {
  ...(incapacidad.datos || {}),
  decision: {
    ...decision,
    notificationSentAt,
    notificationChannel: 'N8N_WHATSAPP_OUTLOOK'
  }
};
return [{ json: {
  ...incapacidad,
  whatsapp_message: whatsappMessage,
  html_decision: htmlDecision,
  datos_notificados: datosNotificados
} }];`,
  },
  id: '26a0645f-30ad-47b1-ab78-48165d59ebdc',
  name: 'Preparar notificación de decisión',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [65472, 36496],
});
addNode({
  parameters: {
    method: 'POST',
    url: 'https://graph.facebook.com/v19.0/840988842437061/messages',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'whatsAppApi',
    sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }] },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: "={{ { messaging_product: 'whatsapp', to: String($json.chat_id), type: 'text', text: { body: $json.whatsapp_message } } }}",
    options: {},
  },
  id: 'bf3a3314-d654-47a3-887f-a23208ff29e6',
  name: 'WhatsApp - Notificar decisión finalizada',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [65696, 36496],
  credentials: whatsappCredentials,
});
addNode({
  parameters: {
    rules: { values: [
      {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
          conditions: [{
            id: 'decision-aprobada',
            leftValue: '={{ $json.estado_tramite }}',
            rightValue: 'APROBADA',
            operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' },
          }],
          combinator: 'and',
        },
        renameOutput: true,
        outputKey: 'APROBADA',
      },
      {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
          conditions: [{
            id: 'decision-denegada',
            leftValue: '={{ $json.estado_tramite }}',
            rightValue: 'DENEGADA',
            operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' },
          }],
          combinator: 'and',
        },
        renameOutput: true,
        outputKey: 'DENEGADA',
      },
    ] },
    options: {},
  },
  id: 'c6d659f9-2f50-4cd4-bce0-06db74201e53',
  name: 'Switch resultado de decisión',
  type: 'n8n-nodes-base.switch',
  typeVersion: 3,
  position: [65920, 36496],
});
addNode({
  parameters: {
    toRecipients: outlookTemplate.parameters.toRecipients,
    subject: "={{ 'Incapacidad aprobada #' + $('Preparar notificación de decisión').item.json.id }}",
    bodyContent: "={{ $('Preparar notificación de decisión').item.json.html_decision }}",
    additionalFields: {
      importance: 'High',
      bodyContentType: 'html',
      saveToSentItems: true,
    },
  },
  id: '0f21f6f5-2729-43dc-8257-69621577b96a',
  name: 'Outlook - Confirmar aprobación',
  type: 'n8n-nodes-base.microsoftOutlook',
  typeVersion: 2,
  position: [66144, 36384],
  webhookId: '63c11a56-0290-46b0-b209-5851563d51de',
  credentials: outlookTemplate.credentials,
});
addNode({
  parameters: {
    method: 'PATCH',
    url: "=http://postgrest:3000/incapacidades?id=eq.{{ $('Preparar notificación de decisión').item.json.id }}&estado_tramite=eq.{{ $('Preparar notificación de decisión').item.json.estado_tramite }}",
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Prefer', value: 'return=minimal' },
    ] },
    sendBody: true,
    bodyParameters: { parameters: [{
      name: 'datos',
      value: "={{ $('Preparar notificación de decisión').item.json.datos_notificados }}",
    }] },
    options: {},
  },
  id: '2889999a-e8f3-482c-a2b2-c4baa795c41f',
  name: 'Marcar decisión notificada',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [66368, 36496],
});

workflow.connections['Monitor decisiones del panel'] = { main: [[{ node: 'Buscar decisiones pendientes de notificar', type: 'main', index: 0 }]] };
workflow.connections['Buscar decisiones pendientes de notificar'] = { main: [[{ node: 'Separar decisiones pendientes', type: 'main', index: 0 }]] };
workflow.connections['Separar decisiones pendientes'] = { main: [[{ node: 'Consultar sesión de decisión', type: 'main', index: 0 }]] };
workflow.connections['Consultar sesión de decisión'] = { main: [[{ node: 'Preparar notificación de decisión', type: 'main', index: 0 }]] };
workflow.connections['Preparar notificación de decisión'] = { main: [[{ node: 'WhatsApp - Notificar decisión finalizada', type: 'main', index: 0 }]] };
workflow.connections['WhatsApp - Notificar decisión finalizada'] = { main: [[{ node: 'Switch resultado de decisión', type: 'main', index: 0 }]] };
workflow.connections['Switch resultado de decisión'] = { main: [
  [{ node: 'Outlook - Confirmar aprobación', type: 'main', index: 0 }],
  [{ node: 'Marcar decisión notificada', type: 'main', index: 0 }],
] };
workflow.connections['Outlook - Confirmar aprobación'] = { main: [[{ node: 'Marcar decisión notificada', type: 'main', index: 0 }]] };
workflow.connections['Marcar decisión notificada'] = { main: [[]] };

await copyFile(workflowPath, backupPath);
await writeFile(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(`LIA.json actualizado: ${workflow.nodes.length} nodos.`);
console.log(`Backup: ${backupPath}`);
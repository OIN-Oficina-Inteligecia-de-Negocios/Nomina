import fs from 'node:fs';
const workflow = JSON.parse(fs.readFileSync('LIA.json', 'utf8'));
const raw = JSON.stringify(workflow);
const errors = [];
const names = new Set();
const ids = new Set();
for (const node of workflow.nodes) {
  if (names.has(node.name)) errors.push(`Nombre duplicado: ${node.name}`);
  if (ids.has(node.id)) errors.push(`ID duplicado: ${node.id}`);
  names.add(node.name);
  ids.add(node.id);
}
for (const [source, outputs] of Object.entries(workflow.connections || {})) {
  if (!names.has(source)) errors.push(`Origen inexistente: ${source}`);
  for (const branches of Object.values(outputs)) {
    for (const branch of branches) {
      for (const connection of branch) {
        if (!names.has(connection.node)) errors.push(`Destino inexistente: ${source} -> ${connection.node}`);
      }
    }
  }
}
const removed = [
  'Monitor de inactividad por conversación', 'Calcular corte inactividad', 'Buscar sesiones inactivas',
  'Separar sesiones inactivas', 'Capturar control de inactividad', 'Esperar inactividad de conversación',
  'Consultar sesión tras espera', 'Validar inactividad de conversación', 'Finalizar sesión inactiva',
  'Confirmar sesiones finalizadas', 'Mensaje cierre por inactividad', 'Monitor decisiones del panel',
  'Buscar decisiones pendientes de notificar', 'Separar decisiones pendientes', 'Consultar sesión de decisión',
  'Preparar notificación de decisión', 'WhatsApp - Notificar decisión finalizada',
  'Recuperar decisión después de WhatsApp', 'Switch resultado de decisión', 'Outlook - Confirmar aprobación',
  'Recuperar decisión después de Outlook', 'Marcar decisión notificada',
];
for (const name of removed) if (names.has(name)) errors.push(`Nodo retirado aún presente: ${name}`);
const waits = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.wait');
const schedules = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.scheduleTrigger');
if (waits.length) errors.push(`Quedan nodos Wait: ${waits.map((node) => node.name).join(', ')}`);
if (schedules.length) errors.push(`Quedan Schedule Trigger: ${schedules.map((node) => node.name).join(', ')}`);
const targets = workflow.connections['Guardar Message ID']?.main?.[0]?.map((item) => item.node) || [];
if (targets.length !== 1 || targets[0] !== 'Router') errors.push(`Ruta posterior a Guardar Message ID incorrecta: ${targets.join(', ')}`);
const router = workflow.nodes.find((node) => node.name === 'Router');
const routerCode = router?.parameters?.jsCode || '';
if (!routerCode.includes('es_respuesta_anterior') || !routerCode.includes('REINICIAR_CONVERSACION')) {
  errors.push('Router no conserva la protección de conversaciones finalizadas');
}
if (raw.includes('$env.SUPABASE_SERVICE_ROLE_KEY')) errors.push('Quedó acceso bloqueado a SUPABASE_SERVICE_ROLE_KEY');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({
  workflow: workflow.name,
  nodes: workflow.nodes.length,
  connections: Object.keys(workflow.connections).length,
  waitNodes: waits.length,
  scheduleTriggers: schedules.length,
  statusNotifications: false,
  immediateRouteAfterMessage: targets[0],
  valid: true,
}, null, 2));
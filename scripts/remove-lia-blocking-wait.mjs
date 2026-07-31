import fs from 'node:fs';
const workflowPath = 'LIA.json';
const backupPath = 'LIA.backup-antes-retirar-wait-bloqueante-2026-07-29.json';
if (!fs.existsSync(backupPath)) fs.copyFileSync(workflowPath, backupPath);
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const remove = new Set([
  'Capturar control de inactividad',
  'Esperar inactividad de conversación',
  'Consultar sesión tras espera',
  'Validar inactividad de conversación',
  'Finalizar sesión inactiva',
  'Confirmar sesiones finalizadas',
  'Mensaje cierre por inactividad',
]);
workflow.nodes = workflow.nodes.filter((node) => !remove.has(node.name));

for (const source of Object.keys(workflow.connections)) {
  if (remove.has(source)) {
    delete workflow.connections[source];
    continue;
  }
  for (const type of Object.keys(workflow.connections[source])) {
    workflow.connections[source][type] = workflow.connections[source][type].map((branch) =>
      branch.filter((connection) => !remove.has(connection.node)),
    );
  }
}

const save = workflow.connections['Guardar Message ID'];
if (!save?.main?.[0]) throw new Error('No existe la salida de Guardar Message ID');
save.main[0] = save.main[0].filter((connection) => connection.node === 'Router');
if (!save.main[0].length) save.main[0].push({ node: 'Router', type: 'main', index: 0 });

fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  nodes: workflow.nodes.length,
  waitNodes: workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.wait').length,
  schedules: workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.scheduleTrigger').length,
  saveMessageTargets: save.main[0].map((connection) => connection.node),
}, null, 2));
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(here, '..', '..', 'LIA.json');
const backupPath = path.resolve(here, '..', '..', 'LIA.backup-antes-corregir-notificaciones-repetidas-2026-07-29.json');
const workflow = JSON.parse(await readFile(workflowPath, 'utf8'));
const getNode = (name) => {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  if (!node) throw new Error(`No existe el nodo ${name}`);
  return node;
};
const addNode = (node) => {
  if (!workflow.nodes.some((candidate) => candidate.name === node.name)) workflow.nodes.push(node);
};

const recoveryCode = "const prepared = $('Preparar notificación de decisión').item.json;\nreturn [{ json: prepared }];";
addNode({
  parameters: { jsCode: recoveryCode },
  id: '169cb93a-28c3-4d79-a0dc-270cc7cf8e22',
  name: 'Recuperar decisión después de WhatsApp',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [65808, 36496],
});
addNode({
  parameters: { jsCode: recoveryCode },
  id: '6154e980-9f71-490b-8ab7-d51544583c9d',
  name: 'Recuperar decisión después de Outlook',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [66368, 36384],
});

getNode('Switch resultado de decisión').position = [66032, 36496];
getNode('Outlook - Confirmar aprobación').position = [66256, 36384];
getNode('Marcar decisión notificada').position = [66592, 36496];

workflow.connections['WhatsApp - Notificar decisión finalizada'] = {
  main: [[{ node: 'Recuperar decisión después de WhatsApp', type: 'main', index: 0 }]],
};
workflow.connections['Recuperar decisión después de WhatsApp'] = {
  main: [[{ node: 'Switch resultado de decisión', type: 'main', index: 0 }]],
};
workflow.connections['Switch resultado de decisión'] = {
  main: [
    [{ node: 'Outlook - Confirmar aprobación', type: 'main', index: 0 }],
    [{ node: 'Marcar decisión notificada', type: 'main', index: 0 }],
  ],
};
workflow.connections['Outlook - Confirmar aprobación'] = {
  main: [[{ node: 'Recuperar decisión después de Outlook', type: 'main', index: 0 }]],
};
workflow.connections['Recuperar decisión después de Outlook'] = {
  main: [[{ node: 'Marcar decisión notificada', type: 'main', index: 0 }]],
};

const mark = getNode('Marcar decisión notificada');
mark.parameters.url = '=http://postgrest:3000/incapacidades?id=eq.{{$json.id}}&estado_tramite=eq.{{$json.estado_tramite}}';
mark.parameters.sendBody = true;
mark.parameters.specifyBody = 'json';
mark.parameters.jsonBody = '={{ { datos: $json.datos_notificados } }}';
delete mark.parameters.bodyParameters;

await copyFile(workflowPath, backupPath);
await writeFile(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log('Cadena de notificación corregida y protegida contra reenvíos por pérdida de contexto.');
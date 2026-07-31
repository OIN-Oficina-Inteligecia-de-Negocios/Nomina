import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(here, '..', '..', 'LIA.json');
const backupPath = path.resolve(here, '..', '..', 'LIA.backup-antes-correccion-subida-binaria-2026-07-29.json');
const workflow = JSON.parse(await readFile(workflowPath, 'utf8'));

for (const name of ['Subir PDF a Storage', 'Subir PDF final a Storage']) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  if (!node) throw new Error(`No existe el nodo ${name}`);
  node.parameters.sendHeaders = true;
  node.parameters.headerParameters = {
    parameters: [
      { name: 'Content-Type', value: 'application/pdf' },
      { name: 'x-upsert', value: 'true' },
      { name: 'cache-control', value: '3600' },
    ],
  };
  node.parameters.sendBody = true;
  node.parameters.contentType = 'binaryData';
  node.parameters.inputDataFieldName = 'data';
  delete node.parameters.bodyParameters;
}

await copyFile(workflowPath, backupPath);
await writeFile(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log('Nodos de almacenamiento configurados para enviar application/pdf binario.');
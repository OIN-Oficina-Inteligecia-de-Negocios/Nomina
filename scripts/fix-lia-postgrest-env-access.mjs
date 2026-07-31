import fs from 'node:fs';
const workflowPath = 'LIA.json';
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const byName = (name) => workflow.nodes.find((node) => node.name === name);

const query = byName('Consultar sesión tras espera');
if (!query) throw new Error('Falta Consultar sesión tras espera');
query.parameters.sendHeaders = true;
query.parameters.headerParameters = {
  parameters: [{ name: 'Content-Type', value: 'application/json' }],
};

const finalizer = byName('Finalizar sesión inactiva');
if (!finalizer) throw new Error('Falta Finalizar sesión inactiva');
finalizer.parameters.sendHeaders = true;
finalizer.parameters.headerParameters = {
  parameters: [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Prefer', value: 'return=representation' },
  ],
};

fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log('Autenticación interna PostgREST ajustada.');
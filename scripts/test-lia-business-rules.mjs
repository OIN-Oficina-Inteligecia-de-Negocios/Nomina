import fs from 'node:fs';
import vm from 'node:vm';
const workflow = JSON.parse(fs.readFileSync('LIA.json', 'utf8'));
const node = (name) => workflow.nodes.find((item) => item.name === name);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const runCode = (name, references = {}) => {
  const code = node(name)?.parameters?.jsCode;
  assert(code, `No existe código para ${name}`);
  const sandbox = {
    $input: { first: () => ({ json: {} }) },
    $: (referenceName) => ({ item: { json: references[referenceName] || {} } }),
    console,
  };
  return vm.runInNewContext(`(async () => { ${code} })()`, sandbox);
};
const chat = {
  chat_id: '573001112233', message_id: 'wamid.nuevo', context_message_id: 'wamid.anterior',
  message_type: 'button', interactiveId: 'confirmar_datos', callback_data: '', textoNorm: '', texto: '',
  tiene_doc: false, es_respuesta_anterior: true,
};
const session = { chat_id: chat.chat_id, estado: 'FINALIZADA', last_message_id: 'wamid.anterior' };
const oldReply = await runCode('Router', {
  'Buscar Empleado': [], 'Buscar Sesión': [session], 'Extraer Datos': chat,
});
assert(oldReply[0]?.json?.ruta === 'IGNORAR', 'Respuesta anterior no ignorada');
const newMessage = await runCode('Router', {
  'Buscar Empleado': [], 'Buscar Sesión': [session],
  'Extraer Datos': { ...chat, context_message_id: '', message_type: 'text', interactiveId: '', texto: 'hola', textoNorm: 'hola', es_respuesta_anterior: false },
});
assert(newMessage[0]?.json?.ruta === 'REINICIAR_CONVERSACION', 'Mensaje nuevo no reinicia conversación');
const waits = workflow.nodes.filter((item) => item.type === 'n8n-nodes-base.wait');
const schedules = workflow.nodes.filter((item) => item.type === 'n8n-nodes-base.scheduleTrigger');
assert(waits.length === 0, 'Existe un Wait que puede bloquear la respuesta');
assert(schedules.length === 0, 'Existen ejecuciones programadas');
const targets = workflow.connections['Guardar Message ID']?.main?.[0]?.map((item) => item.node) || [];
assert(targets.length === 1 && targets[0] === 'Router', 'El mensaje no continúa directamente al Router');
console.log(JSON.stringify({
  oldReplyRoute: oldReply[0].json.ruta,
  newMessageRoute: newMessage[0].json.ruta,
  waitNodes: waits.length,
  periodicTriggers: schedules.length,
  immediateRoute: targets[0],
}, null, 2));
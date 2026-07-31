import { env } from '../config/env.js';

type Incapacity = {
  id: number;
  chat_id: string;
  estado_tramite: string;
};

export async function notifyDecision(
  incapacity: Incapacity,
  observation?: string,
) {
  if (!env.NOTIFICATIONS_ENABLED) return;
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_TOKEN) {
    console.warn('Notificación omitida: faltan credenciales de WhatsApp.');
    return;
  }

  const approved = incapacity.estado_tramite === 'APROBADA';
  const body = approved
    ? `✅ Tu incapacidad con radicado #${incapacity.id} fue aprobada y se ha escalado para continuar el proceso.`
    : `❌ Tu incapacidad con radicado #${incapacity.id} fue denegada.\n\nObservación: ${observation}\n\nGenera una nueva solicitud teniendo en cuenta esta indicación.`;

  const response = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: incapacity.chat_id,
        type: 'text',
        text: { body },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`WhatsApp respondió ${response.status}: ${await response.text()}`);
  }
}

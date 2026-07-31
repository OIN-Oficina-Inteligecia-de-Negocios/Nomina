import 'dotenv/config';
import { z } from 'zod';

const booleanValue = z.preprocess(
  (value) => value === true || value === 'true',
  z.boolean(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:8080'),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: booleanValue.default(false),
  JWT_SECRET: z.string().min(24),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(10),
  NOTIFICATIONS_ENABLED: booleanValue.default(false),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v23.0'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('Configuración inválida:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;

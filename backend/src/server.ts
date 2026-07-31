import { app } from './app.js';
import { env } from './config/env.js';
import { ensureAdminUser } from './db/bootstrap.js';
import { runMigrations } from './db/migrate.js';
import { pool } from './db/pool.js';

async function start() {
  await runMigrations();
  await ensureAdminUser();
  const server = app.listen(env.APP_PORT, () => {
    console.log(`API LIA disponible en el puerto ${env.APP_PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((error) => {
  console.error('No fue posible iniciar la API:', error);
  process.exit(1);
});

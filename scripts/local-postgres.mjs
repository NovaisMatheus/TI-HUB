import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
const pg = new EmbeddedPostgres({
  databaseDir: '.local/postgres',
  user: 'hub',
  password: 'hub_dev_only',
  port: 5432,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: console.error,
});
if (!existsSync('.local/postgres/PG_VERSION')) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'ugb_hub'");
await client.end();
if (!result.rowCount) await pg.createDatabase('ugb_hub');
console.log('PostgreSQL local pronto em 127.0.0.1:5432. Dados persistem em .local/postgres.');
async function stop() {
  await pg.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise(() => {});

import { existsSync } from 'node:fs';
if (existsSync('.local/tls/config.json')) await import('./https-local.mjs');
else console.log('HTTPS local ainda não preparado. Execute pnpm https:prepare para configurá-lo.');

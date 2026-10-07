import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const require = createRequire(resolve('apps/api/package.json'));
require('dotenv').config({ path: resolve('.env'), quiet: true });
const actions = {
  generate: ['generate'],
  migrate: ['migrate', 'deploy'],
  status: ['migrate', 'status'],
};
const args = actions[process.argv[2]];
if (!args) throw new Error('Use generate, migrate ou status.');
const child = spawn(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
  cwd: resolve('apps/api'),
  env: process.env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 1));

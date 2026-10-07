import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) {
  console.log('.env existente preservado.');
} else {
  const template = readFileSync('.env.example', 'utf8');
  writeFileSync(
    '.env',
    template
      .replace(
        'replace-with-a-random-secret-of-at-least-32-characters',
        randomBytes(32).toString('hex'),
      )
      .replace('change-this-development-password', 'Hub-Local-' + randomBytes(12).toString('hex')),
    { flag: 'wx', mode: 0o600 },
  );
  console.log('.env local criado. A senha de desenvolvimento está em SEED_PASSWORD.');
}

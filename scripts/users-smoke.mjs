import './test-data-guard.mjs';
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const seedPassword = readFileSync('.env', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('SEED_PASSWORD='))
  .slice(14);
const base = 'http://localhost:5173/api/';
async function call(path, cookie, data, method = data ? 'POST' : 'GET', expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Cookie: cookie ?? '',
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json();
  assert.equal(response.status, expected, `${path}: ${response.status}`);
  return { body, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const admin = (
  await call('auth/login', null, { email: 'admin@hub.local', password: seedPassword }, 'POST', 201)
).cookie;
const tech = (
  await call(
    'auth/login',
    null,
    { email: 'tecnico@hub.local', password: seedPassword },
    'POST',
    201,
  )
).cookie;
const reader = (
  await call(
    'auth/login',
    null,
    { email: 'consulta@hub.local', password: seedPassword },
    'POST',
    201,
  )
).cookie;
await call('users', null, undefined, 'GET', 401);
await call('users', tech, undefined, 'GET', 403);
await call('users', reader, undefined, 'GET', 403);
const username = `qa.${randomBytes(5).toString('hex')}`;
const password = randomBytes(24).toString('base64url');
const account = {
  username,
  name: 'QA usuário fictício',
  email: `${username}@example.invalid`,
  role: 'TECNICO',
  active: true,
};
await call('users', tech, { ...account, password }, 'POST', 403);
await call('users', admin, { ...account, password: 'short' }, 'POST', 400);
const created = (await call('users', admin, { ...account, password }, 'POST', 201)).body;
await call('users', admin, { ...account, password }, 'POST', 409);
const listed = (await call('users', admin)).body.find((u) => u.id === created.id);
assert.deepEqual(listed.roles, ['TECNICO']);
assert.equal(listed.username, username);
assert.equal('passwordHash' in listed, false);
let session = (
  await call('auth/login', null, { email: username.toUpperCase(), password }, 'POST', 201)
).cookie;
await call('auth/password', session, { currentPassword: 'wrong', password }, 'POST', 400);
const nextPassword = randomBytes(24).toString('base64url');
await call(
  'auth/password',
  session,
  { currentPassword: password, password: nextPassword },
  'POST',
  201,
);
await call('auth/me', session, undefined, 'GET', 401);
await call('auth/login', null, { email: username, password }, 'POST', 401);
session = (
  await call('auth/login', null, { email: account.email, password: nextPassword }, 'POST', 201)
).cookie;
await call(`users/${created.id}`, admin, { ...account, role: 'CONSULTA' }, 'PATCH');
await call(
  'chat/messages',
  session,
  { text: 'não deve publicar', requestId: randomUUID() },
  'POST',
  403,
);
await call(`users/${created.id}`, admin, { ...account, role: 'CONSULTA', active: false }, 'PATCH');
await call('auth/me', session, undefined, 'GET', 401);
await call('auth/login', null, { email: username, password: nextPassword }, 'POST', 401);
await call(`users/${created.id}`, admin, { ...account, role: 'CONSULTA', active: true }, 'PATCH');
await call('auth/me', session, undefined, 'GET', 401);
await call(`users/${created.id}`, admin, { ...account, role: 'CONSULTA', active: false }, 'PATCH');
const me = (await call('auth/me', admin)).body;
await call(
  `users/${me.id}`,
  admin,
  { username: 'qa.admin', name: me.name, email: me.email, role: 'CONSULTA', active: true },
  'PATCH',
  400,
);
console.log(
  'Usuários HTTP OK: cadastro, duplicidade, login por usuário/e-mail, RBAC, troca de senha, invalidação de sessões e desativação. A conta QA permanece inativa.',
);

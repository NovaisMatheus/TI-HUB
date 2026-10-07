import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const password = readFileSync('.env', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('SEED_PASSWORD='))
  .slice(14);
const base = 'http://localhost:5173/api/';
async function call(path, cookie, data, method = data ? 'POST' : 'GET', status = 200) {
  const response = await fetch(base + path, {
    method,
    headers: { Cookie: cookie ?? '', 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json();
  assert.equal(response.status, status, `${path}: ${response.status}`);
  return { body, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const cookie = (
  await call('auth/login', null, { email: 'tecnico@hub.local', password }, 'POST', 201)
).cookie;
const reader = (
  await call('auth/login', null, { email: 'consulta@hub.local', password }, 'POST', 201)
).cookie;
await call('chat/messages', null, undefined, 'GET', 401);
const payload = { text: 'QA: teste fictício do chat da equipe', requestId: randomUUID() };
const first = (await call('chat/messages', cookie, payload, 'POST', 201)).body;
const retry = (await call('chat/messages', cookie, payload, 'POST', 201)).body;
assert.equal(first.id, retry.id);
assert.ok(
  (await call('chat/messages', reader)).body.items.some((m) => m.id === first.id && m.user.name),
);
await call('chat/messages', reader, { ...payload, requestId: randomUUID() }, 'POST', 403);
await call('chat/messages', cookie, { text: ' ', requestId: randomUUID() }, 'POST', 400);
const status = (await call('chat/google/status', cookie)).body;
assert.equal(typeof status.configured, 'boolean');
assert.equal(status.connected, false);
if (!status.configured) await call('chat/google/connect', cookie, {}, 'POST', 400);
const callback = await fetch(base + 'chat/google/callback?state=invalid&code=invalid', {
  redirect: 'manual',
});
assert.equal(callback.status, 302);
assert.ok(callback.headers.get('location').endsWith('?chat=google-error'));
console.log(
  'Chat HTTP OK: mensagens persistidas, visíveis à equipe, retry sem duplicação, consulta sem escrita e OAuth inválido recusado. Google externo não configurado/testado.',
);

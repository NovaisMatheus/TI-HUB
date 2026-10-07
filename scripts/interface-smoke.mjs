import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const password = readFileSync('.env', 'utf8')
  .split(/\r?\n/)
  .find((line) => line.startsWith('SEED_PASSWORD='))
  .slice(14);
const base = 'http://127.0.0.1:3001/api/';
async function login(email) {
  const response = await fetch(base + 'auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie').split(';')[0];
}
async function call(cookie, path, data, method = data ? 'POST' : 'GET', status = 200) {
  const response = await fetch(base + path, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(body)}`);
  return body;
}
const admin = await login('admin@hub.local');
const reader = await login('consulta@hub.local');
const catalog = await call(admin, 'catalog');
let details = 0;
for (const [name, resource] of Object.entries(catalog)) {
  const page = await call(admin, `records/${name}?page=1&pageSize=2`);
  assert.ok(Array.isArray(page.items), name);
  assert.ok(page.items.length <= 2, name);
  if (page.items.length) {
    const item = page.items[0];
    const detail = await call(admin, `records/${name}/${item.id}`);
    assert.equal(detail.id, item.id, name);
    details++;
    const title = item[resource.title];
    if (typeof title === 'string' && title.trim()) {
      const filtered = await call(
        admin,
        `records/${name}?q=${encodeURIComponent(title)}&pageSize=100`,
      );
      assert.ok(
        filtered.items.some((row) => row.id === item.id),
        `${name}: pesquisa pelo título`,
      );
    }
  }
}
await call(admin, 'dashboard');
await call(reader, 'records/equipment?pageSize=2');
await call(reader, 'records/equipment', { hostname: 'NEGATIVE-QA' }, 'POST', 403);
const session = await call(admin, 'auth/me');
try {
  for (const theme of ['dark', 'light', 'system']) {
    await call(admin, 'profile', { theme }, 'PATCH');
    assert.equal((await call(admin, 'auth/me')).theme, theme);
  }
  await call(admin, 'profile', { theme: 'invalid' }, 'PATCH', 400);
} finally {
  await call(admin, 'profile', { theme: session.theme ?? 'system' }, 'PATCH');
}
for (const q of ['192.168.10.50', '13232', 'PC-FINANCEIRO-03']) {
  assert.ok((await call(reader, `search?q=${encodeURIComponent(q)}`)).length, q);
}
const reply = await call(reader, 'ai/ask', { question: 'Diagnóstico SSD Financeiro' }, 'POST', 201);
const own = await call(reader, 'ai/conversations');
assert.ok(own.some((row) => row.id === reply.conversationId));
const other = await call(admin, 'ai/conversations');
assert.ok(!other.some((row) => row.id === reply.conversationId));
await call(
  admin,
  'ai/ask',
  { question: 'Diagnóstico SSD Financeiro', conversationId: reply.conversationId },
  'POST',
  404,
);
await call(reader, `ai/conversations/${reply.conversationId}`, { archived: true }, 'PATCH');
assert.ok(!(await call(reader, 'ai/conversations')).some((row) => row.id === reply.conversationId));
console.log(
  `Interface HTTP OK: ${Object.keys(catalog).length} listagens, ${details} detalhes, filtros, dashboard, busca, três temas persistidos, RBAC e conversas isoladas/arquivadas.`,
);

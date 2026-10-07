import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const document = new JSDOM(readFileSync('tests/fixtures/one-doc.html', 'utf8')).window.document;
const context = {
  document,
  location: { href: 'https://tenant.1doc.com.br/?pg=doc/ver&hash=qa&token=not-stored' },
  URL,
  Date,
};
runInNewContext(readFileSync('extensions/chrome-1doc/collector.js', 'utf8'), context);
const payload = context.ugbCollectOneDoc();
payload.sourceId = `qa-extension-${Date.now()}`;
payload.title = `QA extensão ${payload.sourceId}`;
const password = readFileSync('.env', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('SEED_PASSWORD='))
  .slice(14);
const base = process.env.ONE_DOC_BASE_URL ?? 'http://127.0.0.1:3001/api/';
async function call(
  path,
  { cookie, token, data, method = data ? 'POST' : 'GET', status = 200, origin } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json();
  assert.equal(
    response.status,
    status,
    `${path}: ${response.status} ${JSON.stringify(body).slice(0, 200)}`,
  );
  return { body, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const { cookie } = await call('auth/login', {
  data: { email: 'admin@hub.local', password },
  status: 201,
});
const reader = (
  await call('auth/login', { data: { email: 'consulta@hub.local', password }, status: 201 })
).cookie;
await call('extension/credentials', { cookie: reader, data: {}, status: 403 });
const key = (await call('extension/credentials', { cookie, data: {}, status: 201 })).body;
try {
  await call('extension/session', { token: key.token });
  await call('profile', { token: key.token, status: 401 });
  await call('imports/1doc', { token: 'invalid', data: payload, status: 401 });
  await call('imports/1doc', {
    cookie,
    data: payload,
    origin: 'https://foreign.example.invalid',
    status: 403,
  });
  await call('imports/1doc', {
    token: key.token,
    data: { ...payload, sourceUrl: 'https://foreign.example.invalid/' },
    status: 400,
  });
  // Validate the import-specific body limit above Express's default 100 KB.
  payload.description += '\n' + 'Informação fictícia para teste. '.repeat(4000);
  const initial = (
    await call('imports/1doc', {
      token: key.token,
      data: payload,
      origin: 'chrome-extension://qa-example',
      status: 201,
    })
  ).body;
  assert.equal(initial.created, true);
  assert.equal(initial.dispatches, 2);
  await call(`records/demands/${initial.id}`, {
    cookie,
    data: { status: 'EM_ANDAMENTO', notes: 'Notas internas preservadas', kind: 'AQUISICAO' },
    method: 'PATCH',
  });
  const partial = {
    ...payload,
    dispatches: [{ ...payload.dispatches[0], content: '', attachments: [], context: '' }],
  };
  const updated = (await call('imports/1doc', { token: key.token, data: partial, status: 201 }))
    .body;
  assert.equal(updated.id, initial.id);
  assert.equal(updated.created, false);
  assert.equal(updated.dispatches, 2);
  const detail = (await call(`records/demands/${initial.id}`, { cookie: reader })).body;
  assert.equal(detail.status, 'EM_ANDAMENTO');
  assert.equal(detail.notes, 'Notas internas preservadas');
  assert.equal(detail.kind, 'AQUISICAO');
  const lookup = (
    await call(
      `extension/demand?sourceUrl=${encodeURIComponent(payload.sourceUrl)}&sourceId=${payload.sourceId}`,
      { token: key.token },
    )
  ).body;
  assert.equal(lookup.exists, true);
  assert.equal(lookup.demand.kind, 'AQUISICAO');
  assert.ok(
    (await call('records/demands?kind=AQUISICAO&pageSize=100', { cookie: reader })).body.items.some(
      (row) => row.id === initial.id,
    ),
  );
  assert.equal(detail.documentType, 'Chamado técnico');
  assert.ok(detail.dispatches[0].content.includes('autorização'));
  assert.ok(detail.dispatches[0].metadata.attachments.length);
  assert.ok(!JSON.stringify(detail).includes('not-stored'));
  assert.equal(detail.dataPolicy, 'NO_AI');
  const search = (await call('search?q=Autorizado', { cookie: reader })).body;
  assert.ok(search.some((row) => row.id === initial.id));
  await call(`records/demands/${initial.id}`, {
    cookie: reader,
    data: { status: 'CONCLUIDA' },
    method: 'PATCH',
    status: 403,
  });
  console.log(
    '1Doc HTTP OK: coletor → chave restrita → demanda/despachos; reimportação sem duplicar/perder conteúdo; notas internas, busca, RBAC e corpo >100 KB.',
  );
} finally {
  await call(`extension/credentials/${key.id}`, { cookie, method: 'DELETE' });
}
await call('extension/session', { token: key.token, status: 401 });
console.log(
  'Chave revogada: novo acesso recusado. Fixture anonimizada; HTML original do usuário não foi importado no banco.',
);

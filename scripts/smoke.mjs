import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const base = 'http://127.0.0.1:3001/api/';
async function login(email) {
  const response = await fetch(base + 'auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: env.SEED_PASSWORD }),
  });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie').split(';')[0];
}
async function call(cookie, path, data, method = data ? 'POST' : 'GET') {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
const cookie = await login('admin@hub.local');
const reader = await login('consulta@hub.local');
assert.equal((await fetch(base + 'records/equipment')).status, 401);
assert.equal((await call(reader, 'records/equipment', { hostname: 'UNAUTHORIZED' })).status, 403);
assert.equal((await call(reader, 'audit')).status, 403);
const equipment = (await call(cookie, 'records/equipment?pageSize=100')).data.items[0];
assert.ok(equipment.equipmentNetwork_equipment.ip);
const searched = (await call(cookie, 'search?q=192.168.10.50')).data;
assert.ok(searched.some((s) => s.title === 'PC-FINANCEIRO-03'));
assert.ok((await call(cookie, 'search?q=13232')).data.some((s) => s.title.includes('13232/2026')));
const initial = (await call(cookie, `records/equipment/${equipment.id}`)).data;
const maintenance = await call(cookie, 'records/maintenance', {
  equipmentId: equipment.id,
  type: 'DIAGNOSTICO',
  problem: 'Smoke: falha de SSD',
  diagnosis: 'SMART verificado',
  procedure: 'Diagnóstico presencial',
  solution: 'Orientação registrada',
  status: 'CONCLUIDA',
});
assert.equal(maintenance.status, 201);
const history = (await call(cookie, `records/equipment/${equipment.id}`)).data.history;
assert.ok(history.some((r) => r.id === maintenance.data.id));
const connection = await call(cookie, `equipment/${equipment.id}/connection`, {});
assert.equal(connection.data.mode, 'DISABLED');
assert.equal((await call(cookie, `records/equipment/${equipment.id}`)).data.status, initial.status);
const pop = (await call(cookie, 'records/knowledge')).data.items[0];
const oldVersion = pop.knowledgeArticleVersion_article[0];
assert.equal(
  (
    await call(
      cookie,
      `records/knowledge/${pop.id}`,
      { content: 'Smoke: versão preservada com orientação técnica revisada.' },
      'PATCH',
    )
  ).status,
  200,
);
const revised = (await call(cookie, `records/knowledge/${pop.id}`)).data;
assert.equal(
  revised.knowledgeArticleVersion_article.length,
  pop.knowledgeArticleVersion_article.length + 1,
);
assert.equal(
  revised.knowledgeArticleVersion_article.find((v) => v.id === oldVersion.id).content,
  oldVersion.content,
);
const pending = (await call(cookie, 'records/analyses')).data.items.find((a) => !a.concludedAt);
assert.ok(pending);
assert.equal(
  (
    await call(cookie, `analyses/${pending.id}/conclude`, {
      conclusion: 'ATENDE',
      notes: 'Tentativa inválida com pendências.',
    })
  ).status,
  400,
);
for (const result of pending.analysisRequirementResult_analysis) {
  assert.equal(
    (
      await call(
        cookie,
        `analyses/${pending.id}/evaluate`,
        {
          resultId: result.id,
          result: 'ATENDE',
          offered: 'Evidência documental confirmada',
          reason: 'Conforme ficha técnica revisada',
          equivalenceNotes: '',
        },
        'PATCH',
      )
    ).status,
    200,
  );
}
assert.equal(
  (
    await call(cookie, `analyses/${pending.id}/conclude`, {
      conclusion: 'ATENDE',
      notes: 'Conclusão manual com evidências verificadas.',
    })
  ).status,
  201,
);
assert.equal(
  (
    await call(
      cookie,
      `analyses/${pending.id}/evaluate`,
      {
        resultId: pending.analysisRequirementResult_analysis[0].id,
        result: 'PENDENTE',
        offered: '',
        reason: '',
        equivalenceNotes: '',
      },
      'PATCH',
    )
  ).status,
  400,
);
const inspections = (await call(cookie, 'records/inspections')).data.items;
const inspection = inspections[0];
assert.equal(
  (
    await call(
      cookie,
      `inspections/${inspection.id}/evaluate`,
      {
        itemId: inspection.inspectionItem_inspection[0].id,
        result: 'DIVERGENCIA',
        deliveredDescription: 'Modelo recebido distinto',
        verifiedCharacteristics: 'Modelo e serial conferidos',
        divergences: 'Modelo diverge da proposta',
      },
      'PATCH',
    )
  ).status,
  200,
);
const checked = (await call(cookie, `records/inspections/${inspection.id}`)).data;
assert.equal(checked.result, 'DIVERGENCIA');
const process = (await call(cookie, `records/acquisitions/${checked.commitment.processId}`)).data;
assert.ok(process.timeline.some((e) => e.eventType === 'INSPECTION_RECORDED'));
const ai = (await call(reader, 'ai/ask', { question: 'Diagnóstico SSD Financeiro' })).data;
assert.equal(ai.provider, 'MockAIProvider');
assert.ok(ai.sources.length);
assert.ok((await call(cookie, 'audit')).data.items.length);
console.log(
  'Smoke OK: auth, RBAC, busca IP/empenho, manutenção, POP versionado, análise manual, conferência, timeline, IA e auditoria.',
);

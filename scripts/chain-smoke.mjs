import './test-data-guard.mjs';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const password = readFileSync('.env', 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('SEED_PASSWORD='))
  .slice(14);
const base = 'http://127.0.0.1:3001/api/';
const login = await fetch(base + 'auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'tecnico@hub.local', password }),
});
assert.equal(login.status, 201);
const cookie = login.headers.get('set-cookie').split(';')[0];
async function call(path, data, method = data ? 'POST' : 'GET') {
  const response = await fetch(base + path, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json();
  assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}
async function create(resource, data) {
  return call('records/' + resource, data);
}
const stamp = String(Date.now());
const departments = await call('records/departments');
const departmentId = departments.items[0].id;
const supplier = await create('suppliers', {
  legalName: 'Fornecedor Fictício Teste de Cadeia Ltda.',
  tradeName: 'Teste de Cadeia',
  cnpj: 'QA-' + stamp,
  phone: '(00) 0000-0000',
  email: 'qa@example.invalid',
});
const specification = await create('specifications', {
  code: 'QA-' + stamp,
  name: 'Desktop para validação de fluxo',
  category: 'Hardware',
  summary: 'Descritivo fictício automatizado',
  status: 'VIGENTE',
  content: 'Estação com memória mínima de 16 GB.',
  requirements: 'Memória | Capacidade | >= | 16 | GB | capacidade',
});
const spec = await call(`records/specifications/${specification.id}`);
const version = spec.specificationVersion_specification[0];
await call(
  `records/specifications/${spec.id}`,
  {
    content: 'Nova versão com memória mínima de 32 GB.',
    requirements: 'Memória | Capacidade | >= | 32 | GB | capacidade',
  },
  'PATCH',
);
const request = await create('requests', {
  number: 'QA-' + stamp,
  year: 2026,
  unit: 'Unidade fictícia QA',
  departmentId,
  object: 'Desktop de validação',
  description: 'Requisição fictícia para teste',
  status: 'RECEBIDA',
  specificationVersionId: version.id,
  quantity: 2,
});
const requestDetail = await call(`records/requests/${request.id}`);
const requestItem = requestDetail.purchaseRequestItem_request[0];
const process = await create('acquisitions', {
  number: 'QA-' + stamp,
  title: 'Cadeia técnica validada',
  requestId: request.id,
  status: 'EM_ANALISE',
});
const proposal = await create('proposals', {
  processId: process.id,
  supplierId: supplier.id,
  requestItemId: requestItem.id,
  brand: 'Marca fictícia',
  model: 'QA Desktop',
  manufacturer: 'Fabricante fictício',
  quantity: 2,
  price: 3000,
  offeredDescription: 'Memória RAM 16 GB',
});
const proposalDetail = await call(`records/proposals/${proposal.id}`);
const item = proposalDetail.proposalItem_proposal[0];
const analysis = await create('analyses', {
  processId: process.id,
  proposalItemId: item.id,
  specificationVersionId: version.id,
  notes: 'Análise com a versão original preservada.',
});
const analysisDetail = await call(`records/analyses/${analysis.id}`);
assert.equal(analysisDetail.specificationVersion.version, 1);
assert.equal(analysisDetail.analysisRequirementResult_analysis[0].requirement.value, '16');
const evaluated = analysisDetail.analysisRequirementResult_analysis[0];
await call(
  `analyses/${analysis.id}/evaluate`,
  {
    resultId: evaluated.id,
    result: 'ATENDE',
    offered: '16 GB DDR4',
    reason: 'Confirmado na ficha técnica',
    equivalenceNotes: '',
  },
  'PATCH',
);
await call(`analyses/${analysis.id}/conclude`, {
  conclusion: 'ATENDE',
  notes: 'Memória confirmada na versão utilizada pela requisição.',
});
const commitment = await create('commitments', {
  number: 'QA-' + stamp,
  year: 2026,
  supplierId: supplier.id,
  processId: process.id,
  requestId: request.id,
  proposalItemId: item.id,
  quantity: 2,
  value: 3000,
  status: 'EMITIDO',
});
const inspection = await create('inspections', {
  commitmentId: commitment.id,
  notes: 'Verificação física do item entregue.',
});
const inspectionDetail = await call(`records/inspections/${inspection.id}`);
await call(
  `inspections/${inspection.id}/evaluate`,
  {
    itemId: inspectionDetail.inspectionItem_inspection[0].id,
    result: 'ATENDE',
    deliveredDescription: 'QA Desktop com 16 GB DDR4',
    verifiedCharacteristics: 'Modelo, memória e serial conferidos',
    divergences: '',
  },
  'PATCH',
);
const final = await call(`records/acquisitions/${process.id}`);
assert.equal(final.proposals.length, 1);
assert.equal(final.analyses.length, 1);
assert.equal(final.commitments.length, 1);
assert.equal(final.inspections.length, 1);
assert.ok(final.timeline.some((e) => e.eventType === 'ANALYSIS_CONCLUDED'));
assert.ok(final.timeline.some((e) => e.eventType === 'INSPECTION_RECORDED'));
console.log(
  'Cadeia OK: fornecedor → descritivo versionado → requisição → processo → proposta → análise da versão original → empenho → conferência → timeline.',
);

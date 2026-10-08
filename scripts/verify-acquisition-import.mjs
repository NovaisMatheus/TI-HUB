// Disposable database only. Never writes fixtures to the application's database.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { clearTimeout, setTimeout } from 'node:timers';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
const require = createRequire(resolve('apps/api/package.json'));
require('dotenv').config({ path: '.env', quiet: true });
require('reflect-metadata');
const { PrismaClient } = require('@prisma/client');
const { DemandController } = require(resolve('apps/api/dist/demands/demand.controller.js'));
const { AcquisitionController } = require(
  resolve('apps/api/dist/acquisitions/acquisition.controller.js'),
);
const { DocumentService } = require(resolve('apps/api/dist/documents/document.service.js'));
const { DocumentController } = require(resolve('apps/api/dist/documents/document.controller.js'));
const { ResourceService } = require(resolve('apps/api/dist/resources/resource.service.js'));
const { RecordHooks } = require(resolve('apps/api/dist/resources/record-hooks.js'));
const { WorkflowService } = require(resolve('apps/api/dist/acquisitions/workflow.service.js'));
const { catalog } = require(resolve('apps/api/dist/resources/catalog.js'));
const { SearchService } = require(resolve('apps/api/dist/search/search.service.js'));
const { JSDOM } = createRequire(resolve('package.json'))('jsdom');
const ExcelJS = require('exceljs');
const JSZip = createRequire(require.resolve('exceljs'))('jszip');
function pdf(text) {
  const stream = `BT /F1 12 Tf 40 700 Td (${text}) Tj ET`;
  const bodies = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of bodies.entries()) {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const start = body.length;
  body += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
    .join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(body);
}
const database = `hub_acquisition_review_${Date.now()}`;
assert.match(database, /^hub_acquisition_review_\d+$/);
const adminUrl = new URL(process.env.DATABASE_URL);
adminUrl.pathname = '/postgres';
const isolatedUrl = new URL(adminUrl);
isolatedUrl.pathname = `/${database}`;
const admin = new PrismaClient({ datasourceUrl: adminUrl.href });
let db,
  created = false;
let server;
try {
  console.log('Verificação: criando base temporária.');
  await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  created = true;
  const migration = spawnSync(
    process.execPath,
    [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
    {
      cwd: resolve('apps/api'),
      env: { ...process.env, DATABASE_URL: isolatedUrl.href },
      encoding: 'utf8',
    },
  );
  assert.equal(migration.status, 0, 'Migrations da base isolada devem passar');
  console.log('Verificação: extraindo anexos de teste.');
  db = new PrismaClient({ datasourceUrl: isolatedUrl.href });
  const account = await db.user.create({
    data: {
      name: 'Revisão isolada',
      email: 'review@example.invalid',
      passwordHash: 'disabled-test-account',
      active: false,
    },
  });
  const user = {
    ...account,
    permissions: [
      ...new Set(
        Object.values(catalog).flatMap((c) => [`${c.permission}.read`, `${c.permission}.write`]),
      ),
    ],
  };
  const req = { user, ip: '127.0.0.1' };
  const files = new DocumentService(db),
    documents = new DocumentController(db, files);
  const upload = (name, data) =>
    files.upload({ name, dataBase64: Buffer.from(data).toString('base64') }, user.id);
  const specificationFile = await upload(
    'Descritivo.pdf',
    pdf('Memoria minima 16 GB; garantia 36 meses.'),
  );
  assert.equal(specificationFile.extractionStatus, 'EXTRAIDO');
  console.log('Verificação: PDF extraído.');
  assert.match(
    (await db.documentFile.findUniqueOrThrow({ where: { id: specificationFile.fileId } }))
      .extractedText,
    /16 GB/,
  );
  assert.equal(
    (await upload('Descritivo.pdf', pdf('Memoria minima 16 GB; garantia 36 meses.'))).fileId,
    specificationFile.fileId,
  );
  const book = new ExcelJS.Workbook();
  book.addWorksheet('Orcamento').addRow(['Equipamento', 'Desktop', '3500']);
  const budget = await upload('Orcamento.xlsx', await book.xlsx.writeBuffer());
  assert.equal(budget.extractionStatus, 'EXTRAIDO');
  console.log('Verificação: planilha extraída.');
  assert.match(
    (await db.documentFile.findUniqueOrThrow({ where: { id: budget.fileId } })).extractedText,
    /Desktop.*3500/,
  );
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    'word/document.xml',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Requisicao de computadores</w:t></w:r></w:p></w:body></w:document>',
  );
  assert.equal(
    (await upload('Requisicao.docx', await zip.generateAsync({ type: 'nodebuffer' })))
      .extractionStatus,
    'EXTRAIDO',
  );
  assert.equal(
    (await upload('Digitalizacao.png', Buffer.from([137, 80, 78, 71]))).extractionStatus,
    'NAO_SUPORTADO',
  );
  assert.equal(
    (await upload('invalido.pdf', Buffer.from('%PDF-1.4 invalid'))).extractionStatus,
    'FALHA',
  );
  const html = readFileSync('tests/fixtures/one-doc.html', 'utf8').replaceAll(
    'Chamado técnico',
    'Memorando',
  );
  const context = {
    document: new JSDOM(html).window.document,
    location: { href: 'https://tenant.1doc.com.br/?pg=doc/ver&id=isolated' },
    URL,
    Date,
  };
  runInNewContext(readFileSync('extensions/chrome-1doc/collector.js', 'utf8'), context);
  const payload = JSON.parse(JSON.stringify(context.ugbCollectOneDoc()));
  payload.kind = 'AQUISICAO';
  payload.attachments = [
    {
      name: 'Descritivo.pdf',
      url: 'https://tenant.1doc.com.br/desc.pdf',
      kind: 'file',
      details: '',
      ...specificationFile,
    },
  ];
  delete payload.attachments[0].size;
  payload.dispatches[0].attachments = [
    {
      name: 'Orcamento.xlsx',
      url: 'https://tenant.1doc.com.br/orc.xlsx',
      kind: 'file',
      details: '',
      fileId: budget.fileId,
      extractionStatus: budget.extractionStatus,
    },
  ];
  const demands = new DemandController(db),
    hooks = new RecordHooks(),
    resources = new ResourceService(db, hooks),
    workflow = new WorkflowService(db),
    acquisitions = new AcquisitionController(db, hooks);
  const first = await demands.collect(payload, req);
  console.log('Verificação: processo criado; conferindo proposta e análise.');
  assert.ok(first.acquisitionId);
  assert.equal((await demands.collect(payload, req)).acquisitionId, first.acquisitionId);
  assert.equal(await db.purchaseProcess.count(), 1);
  const detail = await resources.get('acquisitions', first.acquisitionId, user);
  assert.equal(detail.sourceDemand.dispatches.length, payload.dispatches.length);
  assert.equal(detail.request.purchaseRequestItem_request[0].quantity, null);
  assert.match(detail.request.purchaseRequestItem_request[0].specificationVersion.content, /16 GB/);
  assert.ok(detail.documents.some((doc) => doc.file?.extractedText.includes('3500')));
  assert.ok(detail.documents.some((doc) => doc.category === 'ORCAMENTO'));
  const count = await db.documentReference.count();
  const signed = JSON.parse(JSON.stringify(payload));
  signed.attachments[0].url += '?X-Amz-Signature=qa-legacy-signature';
  const oldId =
    '1doc-' +
    createHash('sha256')
      .update(`${first.acquisitionId}\n${signed.attachments[0].url}\noriginal`)
      .digest('hex');
  await db.documentReference.create({
    data: {
      id: oldId,
      entityType: 'acquisitions',
      entityId: first.acquisitionId,
      url: signed.attachments[0].url,
      title: 'Descritivo.pdf',
      provider: 'URL',
      mimeType: 'application/pdf',
      description: 'Legacy fixture',
      category: 'REQUISICAO',
      fileId: specificationFile.fileId,
      createdById: user.id,
    },
  });
  await demands.collect(signed, req);
  assert.equal(
    await db.documentReference.count(),
    count,
    'Signed URL changes must not duplicate legacy attachments',
  );
  assert.equal(await db.documentReference.findUnique({ where: { id: oldId } }), null);
  payload.dispatches[0].author = 'Nome atualizado';
  await demands.collect(payload, req);
  assert.equal(
    await db.documentReference.count(),
    count,
    'Metadata edits must not duplicate attachments',
  );
  const retry = JSON.parse(JSON.stringify(payload));
  delete retry.attachments[0].fileId;
  retry.attachments[0].extractionStatus = 'NAO_COPIADO';
  delete retry.dispatches[0].attachments[0].fileId;
  await demands.collect(retry, req);
  const retained = await resources.get('acquisitions', first.acquisitionId, user);
  assert.equal(retained.sourceDemand.metadata.attachments[0].fileId, specificationFile.fileId);
  assert.equal(retained.sourceDemand.dispatches[0].metadata.attachments[0].fileId, budget.fileId);
  assert.match(
    retained.request.purchaseRequestItem_request[0].specificationVersion.content,
    /16 GB/,
  );
  const reference = detail.documents.find((doc) => doc.fileId === specificationFile.fileId);
  let downloaded;
  await documents.download(reference.id, req, {
    setHeader() {},
    send(data) {
      downloaded = data;
    },
  });
  assert.deepEqual(downloaded, pdf('Memoria minima 16 GB; garantia 36 meses.'));
  await assert.rejects(
    documents.download(
      reference.id,
      { user: { ...user, permissions: ['documents.read'] } },
      { setHeader() {}, send() {} },
    ),
    (error) => error.getStatus() === 403,
  );
  const reviewed = await acquisitions.specification(
    first.acquisitionId,
    {
      content: 'Memoria minima 16 GB.',
      quantity: 2,
      requirements: 'Memoria | Capacidade | >= | 16 | GB | numero',
    },
    req,
  );
  const supplier = await resources.save(
    'suppliers',
    undefined,
    {
      legalName: 'Fornecedor isolado',
      tradeName: 'Fornecedor isolado',
      cnpj: 'ISOLADO',
      phone: '0000',
      email: 'supplier@example.invalid',
    },
    user,
  );
  const proposal = await resources.save(
    'proposals',
    undefined,
    {
      processId: first.acquisitionId,
      supplierId: supplier.id,
      requestItemId: detail.request.purchaseRequestItem_request[0].id,
      brand: 'Marca de teste',
      model: 'Modelo de teste',
      manufacturer: 'Fabricante de teste',
      quantity: 2,
      price: 3500,
      offeredDescription: 'Memoria 16 GB',
      manufacturerUrl: 'https://example.invalid/product',
      notes: '',
    },
    user,
  );
  const product = await db.proposalItem.findFirstOrThrow({ where: { proposalId: proposal.id } });
  const analysis = await resources.save(
    'analyses',
    undefined,
    {
      processId: first.acquisitionId,
      proposalItemId: product.id,
      specificationVersionId: reviewed.specificationVersionId,
      notes: '',
    },
    user,
  );
  await assert.rejects(
    workflow.conclude(analysis.id, { conclusion: 'ATENDE', notes: 'Ainda pendente' }, user),
    (error) => error.getStatus() === 400,
  );
  const result = await db.analysisRequirementResult.findFirstOrThrow({
    where: { analysisId: analysis.id },
  });
  const assessed = await workflow.evaluateAnalysis(
    analysis.id,
    {
      resultId: result.id,
      result: 'ATENDE',
      offered: '16 GB',
      reason: 'Conferido na referencia',
      referenceUrls: ['https://example.invalid/manual'],
    },
    user,
  );
  assert.deepEqual(assessed.referenceUrls, ['https://example.invalid/manual']);
  await assert.rejects(
    workflow.evaluateAnalysis(
      analysis.id,
      {
        resultId: result.id,
        result: 'ATENDE',
        offered: '',
        reason: '',
        referenceUrls: ['javascript:alert(1)'],
      },
      user,
    ),
    (error) => error.getStatus() === 400,
  );
  await workflow.conclude(
    analysis.id,
    { conclusion: 'ATENDE', notes: 'Conferido pela equipe' },
    user,
  );
  await assert.rejects(
    acquisitions.specification(
      first.acquisitionId,
      {
        content: 'Mudanca',
        quantity: 3,
        requirements: 'Memoria | Capacidade | >= | 32 | GB | numero',
      },
      req,
    ),
    (error) => error.getStatus() === 400,
  );
  payload.description = 'Atualizacao no 1Doc';
  payload.dispatches = [];
  await demands.collect(payload, req);
  assert.equal(
    (await db.purchaseRequestItem.findUniqueOrThrow({ where: { id: product.requestItemId } }))
      .specificationVersionId,
    reviewed.specificationVersionId,
  );
  assert.equal(await db.demandDispatch.count(), detail.sourceDemand.dispatches.length);
  assert.equal(await db.documentReference.count(), count);
  const rejected = {
    ...payload,
    attachments: [{ ...payload.attachments[0], fileId: 'a'.repeat(64) }],
  };
  await assert.rejects(demands.collect(rejected, req), (error) => error.getStatus() === 400);
  const search = new SearchService(db);
  const parallel = {
    ...payload,
    sourceId: 'parallel-document',
    number: '99/2026',
    description: 'Descricao inicial',
  };
  const parallelProcess = await demands.collect(parallel, req);
  const [, parallelReview] = await Promise.all([
    demands.collect({ ...parallel, description: 'Descricao atualizada' }, req),
    acquisitions.specification(
      parallelProcess.acquisitionId,
      {
        content: 'Descritivo conferido em paralelo',
        quantity: 2,
        requirements: 'Memoria | Capacidade | >= | 16 | GB | numero',
      },
      req,
    ),
  ]);
  const parallelItem = await db.purchaseRequestItem.findFirstOrThrow({
    where: {
      request: { purchaseProcess_request: { some: { id: parallelProcess.acquisitionId } } },
    },
    include: { specificationVersion: { include: { specificationRequirement_version: true } } },
  });
  assert.equal(parallelItem.specificationVersionId, parallelReview.specificationVersionId);
  assert.equal(parallelItem.specificationVersion.specificationRequirement_version.length, 1);
  assert.equal(parallelItem.quantity, 2);
  assert.ok(
    (await search.search('Memoria', user)).some((source) =>
      source.href.startsWith('/specifications/'),
    ),
  );
  assert.ok(
    !(await search.search('Memoria', user, true)).some((source) =>
      /\/(specifications|analyses|proposals)\//.test(source.href),
    ),
    'Imported NO_AI records must stay out of assistant sources',
  );
  assert.equal(
    await search.authorized(
      {
        id: detail.request.purchaseRequestItem_request[0].specificationVersion.specificationId,
        href:
          '/specifications/' +
          detail.request.purchaseRequestItem_request[0].specificationVersion.specificationId,
      },
      user,
    ),
    false,
  );
  await db.user.update({ where: { id: user.id }, data: { active: true } });
  const role = await db.role.create({ data: { name: 'ISOLATED_HTTP' } });
  for (const key of user.permissions) {
    const permission = await db.permission.upsert({ where: { key }, create: { key }, update: {} });
    await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  }
  await db.userRole.create({ data: { roleId: role.id, userId: user.id } });
  const secret = 'isolated-http-check-only-32-characters-minimum';
  server = spawn(process.execPath, [resolve('apps/api/dist/main.js')], {
    cwd: resolve('apps/api'),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      DATABASE_URL: isolatedUrl.href,
      PORT: '3002',
      API_HOST: '127.0.0.1',
      JWT_SECRET: secret,
    },
  });
  await new Promise((resolveReady, reject) => {
    const timer = setTimeout(
      () => reject(new Error('API isolada não iniciou em 30 segundos.')),
      30000,
    );
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('api_ready')) {
        clearTimeout(timer);
        resolveReady();
      }
    });
    server.stderr.on('data', () => {});
    server.once('exit', () => {
      clearTimeout(timer);
      reject(new Error('API isolada encerrou antes do teste HTTP.'));
    });
    server.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  const credential = await demands.issue(req);
  const uploadResponse = await fetch('http://127.0.0.1:3002/api/extension/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential.token}` },
    body: JSON.stringify({
      name: 'large.txt',
      dataBase64: Buffer.from('A'.repeat(1024 * 1024)).toString('base64'),
    }),
  });
  assert.equal(uploadResponse.status, 201, 'Upload HTTP deve aceitar corpo acima de 100 KB');
  assert.equal((await uploadResponse.json()).extractionStatus, 'TEXTO_PARCIAL');
  assert.equal(
    (await fetch('http://127.0.0.1:3002/api/documents/' + reference.id + '/file')).status,
    401,
  );
  const { JwtService } = require('@nestjs/jwt');
  const cookie = new JwtService({ secret }).sign({ sub: user.id, version: 0 }, { expiresIn: '2m' });
  const downloadResponse = await fetch(
    'http://127.0.0.1:3002/api/documents/' + reference.id + '/file',
    { headers: { Cookie: `hub_session=${cookie}` } },
  );
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /^attachment;/);
  assert.deepEqual(Buffer.from(await downloadResponse.arrayBuffer()), downloaded);
  console.log(
    JSON.stringify({
      isolatedDatabase: true,
      formats: ['PDF', 'DOCX', 'XLSX'],
      filesDownloaded: true,
      processIdempotent: true,
      dispatchesPreserved: true,
      specificationVersionPreserved: true,
      analysisAndReferences: true,
      accessChecked: true,
      authenticatedHTTPUploadAndDownload: true,
    }),
  );
} catch (error) {
  console.error(`Verificação isolada falhou: ${error.name} ${error.message}`);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
  if (db) await db.$disconnect();
  if (created) await admin.$executeRawUnsafe(`DROP DATABASE "${database}"`);
  await admin.$disconnect();
}

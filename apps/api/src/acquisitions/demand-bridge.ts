import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';

type Captured = {
  fields?: { label: string; value: string }[];
  departments?: string[];
  attachments?: { name: string; url: string; details: string; kind: string; fileId?: string }[];
};
export function canonicalDocumentUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()])
    if (
      /token|senha|password|session|csrf|auth|^x-amz-|^signature$|^expires$|^awsaccesskeyid$/i.test(
        key,
      )
    )
      url.searchParams.delete(key);
  return url.href;
}
export function documentCategory(title: string) {
  const value = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/descritiv|especifica|termo.?de.?referencia/.test(value)) return 'DESCRITIVO';
  if (/orcamento|cotacao|proposta/.test(value)) return 'ORCAMENTO';
  if (/requisic|solicitacao/.test(value)) return 'REQUISICAO';
  if (/parecer|analise/.test(value)) return 'PARECER';
  return 'OUTRO';
}
export function capturedSpecification(description: string, metadata: Captured) {
  const explicit = (metadata.fields ?? []).filter((field) =>
    /descritiv|especifica|descri[cç][aã]o.*(?:item|produto|objeto)/i.test(field.label),
  );
  return explicit.length
    ? explicit.map((field) => `${field.label}\n${field.value}`).join('\n\n')
    : description;
}
export async function syncAcquisitionDemand(
  tx: Prisma.TransactionClient,
  demandId: string,
  userId: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "Demand" WHERE "id" = ${demandId} FOR UPDATE`;
  const demand = await tx.demand.findUniqueOrThrow({
    where: { id: demandId },
    include: { dispatches: { orderBy: { sequence: 'asc' } } },
  });
  if (demand.kind !== 'AQUISICAO') return null;
  const metadata = demand.metadata as Captured;
  const attachments = [
    ...(metadata.attachments ?? []),
    ...demand.dispatches.flatMap((dispatch) => (dispatch.metadata as Captured).attachments ?? []),
  ];
  const files = await tx.documentFile.findMany({
    where: { id: { in: attachments.flatMap((a) => (a.fileId ? [a.fileId] : [])) } },
    select: { id: true, extractedText: true },
  });
  const content = [
    capturedSpecification(demand.description, metadata),
    ...attachments
      .filter((a) => ['DESCRITIVO', 'REQUISICAO'].includes(documentCategory(a.name)))
      .flatMap((a) => {
        const text = files.find((f) => f.id === a.fileId)?.extractedText;
        return text ? [`Anexo: ${a.name}\n${text}`] : [];
      }),
  ]
    .join('\n\n')
    .slice(0, 200000);
  let process = await tx.purchaseProcess.findUnique({ where: { sourceDemandId: demandId } });
  if (!process) {
    const specification = await tx.technicalSpecification.create({
      data: {
        code: `1DOC-${demand.id}`,
        name: demand.title,
        category: 'IMPORTADO_1DOC',
        summary: `Texto recebido de ${demand.documentType} ${demand.number}; revisar requisitos antes da análise.`,
        status: 'EM_REVISAO',
        responsibleId: userId,
        specificationVersion_specification: { create: { version: 1, content } },
      },
      include: { specificationVersion_specification: true },
    });
    const request = await tx.purchaseRequest.create({
      data: {
        number: `${demand.documentType} ${demand.number} · ${demand.sourceHost}`,
        year: Number(demand.number.match(/\/(\d{4})$/)?.[1] ?? demand.capturedAt.getFullYear()),
        unit: metadata.departments?.join(' · ') ?? '',
        object: demand.title,
        description: demand.description,
        status: 'A_CONFERIR',
        responsibleId: userId,
        purchaseRequestItem_request: {
          create: {
            description: demand.title,
            quantity: null,
            specificationVersionId: specification.specificationVersion_specification[0].id,
          },
        },
      },
    });
    process = await tx.purchaseProcess.create({
      data: {
        number: `1DOC ${demand.documentType} ${demand.number} · ${demand.sourceHost}`,
        title: demand.title,
        status: 'A_CONFERIR',
        requestId: request.id,
        responsibleId: userId,
        sourceDemandId: demandId,
        dataPolicy: demand.dataPolicy,
      },
    });
    await tx.timelineEvent.create({
      data: {
        processId: process.id,
        entityType: 'acquisitions',
        entityId: process.id,
        userId,
        eventType: 'DEMAND_IMPORTED',
        title: 'Demanda 1Doc vinculada ao processo',
        description: `${demand.documentType} ${demand.number}; requisição e descritivo aguardam conferência.`,
      },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: 'IMPORT_ACQUISITION',
        entityType: 'acquisitions',
        entityId: process.id,
        after: { sourceDemandId: demandId, requestId: request.id },
      },
    });
  }
  await tx.$queryRaw`SELECT "id" FROM "PurchaseProcess" WHERE "id" = ${process.id} FOR UPDATE`;
  const request = await tx.purchaseRequest.findUniqueOrThrow({ where: { id: process.requestId } });
  if (request.status === 'A_CONFERIR') {
    await tx.purchaseRequest.update({
      where: { id: request.id },
      data: { description: demand.description, object: demand.title },
    });
    const item = await tx.purchaseRequestItem.findFirst({
      where: { requestId: request.id },
      include: { specificationVersion: true },
    });
    if (item && item.specificationVersion.content !== content) {
      const latest = await tx.specificationVersion.findFirstOrThrow({
        where: { specificationId: item.specificationVersion.specificationId },
        orderBy: { version: 'desc' },
      });
      const version = await tx.specificationVersion.create({
        data: { specificationId: latest.specificationId, version: latest.version + 1, content },
      });
      await tx.purchaseRequestItem.update({
        where: { id: item.id },
        data: { specificationVersionId: version.id },
      });
    }
  }
  const refs = [
    {
      name: `${demand.documentType} ${demand.number}`,
      url: demand.sourceUrl,
      details: 'Documento original e despachos no 1Doc',
      category: 'REQUISICAO',
      context: 'Documento original',
      identity: 'original',
      fileId: undefined as string | undefined,
    },
    ...(metadata.attachments ?? []).map((a) => ({
      ...a,
      category: documentCategory(a.name),
      context: 'Documento original',
      identity: 'original',
    })),
    ...demand.dispatches.flatMap((dispatch) =>
      ((dispatch.metadata as Captured).attachments ?? []).map((a) => ({
        ...a,
        category: documentCategory(a.name),
        context: `${dispatch.title} · ${dispatch.author} · ${dispatch.dateLabel}`,
        identity: dispatch.sourceId,
      })),
    ),
  ];
  for (const ref of refs) {
    const url = canonicalDocumentUrl(ref.url);
    const id =
      '1doc-' + createHash('sha256').update(`${process.id}\n${url}\n${ref.identity}`).digest('hex');
    const description = `${ref.context}\n${ref.details}\nCategoria sugerida pelo nome do documento; confira o conteúdo.`;
    const legacyId =
      '1doc-' +
      createHash('sha256').update(`${process.id}\n${ref.url}\n${ref.identity}`).digest('hex');
    const legacy =
      legacyId !== id ? await tx.documentReference.findUnique({ where: { id: legacyId } }) : null;
    const previous =
      legacy?.entityType === 'acquisitions' && legacy.entityId === process.id ? legacy : null;
    await tx.documentReference.upsert({
      where: { id },
      create: {
        id,
        entityType: 'acquisitions',
        entityId: process.id,
        title: ref.name,
        provider: 'URL',
        url,
        category: ref.category,
        mimeType: /\.pdf(?:\?|$)/i.test(ref.url) ? 'application/pdf' : 'text/html',
        description,
        createdById: userId,
        fileId: ref.fileId ?? previous?.fileId,
        dataPolicy: demand.dataPolicy,
      },
      update: {
        url,
        title: ref.name,
        description,
        ...(ref.fileId ? { fileId: ref.fileId } : {}),
        ...(!ref.fileId && previous?.fileId ? { fileId: previous.fileId } : {}),
        ...(previous && previous.category !== ref.category ? { category: previous.category } : {}),
      },
    });
    if (previous) await tx.documentReference.delete({ where: { id: previous.id } });
  }
  return process;
}

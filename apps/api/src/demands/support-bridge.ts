import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { canonicalDocumentUrl, documentCategory } from '../acquisitions/demand-bridge';
import { publicationDate } from '../acquisitions/timeline';
type Capture = {
  openedAt?: string;
  attachments?: { name: string; url: string; details: string; fileId?: string }[];
};
export async function syncSupportDemand(
  tx: Prisma.TransactionClient,
  demandId: string,
  userId: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "Demand" WHERE "id" = ${demandId} FOR UPDATE`;
  const demand = await tx.demand.findUniqueOrThrow({
    where: { id: demandId },
    include: { dispatches: { orderBy: { sequence: 'asc' } } },
  });
  if (demand.kind !== 'SUPORTE') return null;
  const metadata = demand.metadata as Capture;
  let record = await tx.maintenanceRecord.findUnique({ where: { sourceDemandId: demand.id } });
  if (!record) {
    record = await tx.maintenanceRecord.create({
      data: {
        sourceDemandId: demand.id,
        type: 'OCORRENCIA',
        problem:
          `${demand.documentType} ${demand.number} · ${demand.title}\n\n${demand.description}`.slice(
            0,
            50000,
          ),
        status: demand.status,
        notes: demand.notes,
        technicianId: userId,
        dataPolicy: demand.dataPolicy,
        occurredAt: publicationDate(metadata.openedAt ?? '')?.occurredAt ?? demand.capturedAt,
      },
    });
    await tx.maintenanceAction.create({
      data: {
        recordId: record.id,
        description:
          'Demanda 1Doc vinculada ao atendimento de suporte; equipamento e diagnóstico aguardam conferência.',
      },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: 'IMPORT_SUPPORT',
        entityType: 'maintenance',
        entityId: record.id,
        after: { sourceDemandId: demand.id },
      },
    });
  } else {
    await tx.maintenanceRecord.update({
      where: { id: record.id },
      data: { status: demand.status, notes: demand.notes },
    });
  }
  const refs = [
    {
      name: `${demand.documentType} ${demand.number}`,
      url: demand.sourceUrl,
      details: 'Documento original no 1Doc',
      context: 'Documento original',
      identity: 'original',
      category: 'REQUISICAO',
      fileId: undefined as string | undefined,
    },
    ...(metadata.attachments ?? []).map((a) => ({
      ...a,
      context: 'Documento original',
      identity: 'original',
      category: documentCategory(a.name),
    })),
    ...demand.dispatches.flatMap((dispatch) =>
      ((dispatch.metadata as Capture).attachments ?? []).map((a) => ({
        ...a,
        identity: dispatch.sourceId,
        context: `${dispatch.title} · ${dispatch.author} · ${dispatch.dateLabel}`,
        category: documentCategory(a.name),
      })),
    ),
  ];
  for (const ref of refs) {
    const url = canonicalDocumentUrl(ref.url);
    const id =
      '1doc-support-' +
      createHash('sha256').update(`${record.id}\n${url}\n${ref.identity}`).digest('hex');
    await tx.documentReference.upsert({
      where: { id },
      create: {
        id,
        entityType: 'maintenance',
        entityId: record.id,
        title: ref.name,
        url,
        description: `${ref.context}\n${ref.details}`,
        provider: 'URL',
        category: ref.category,
        mimeType: /\.pdf(?:\?|$)/i.test(url) ? 'application/pdf' : 'text/html',
        fileId: ref.fileId,
        createdById: userId,
        dataPolicy: demand.dataPolicy,
      },
      update: {
        title: ref.name,
        url,
        description: `${ref.context}\n${ref.details}`,
        ...(ref.fileId ? { fileId: ref.fileId } : {}),
      },
    });
  }
  return record;
}

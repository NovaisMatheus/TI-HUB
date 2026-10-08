import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SessionUser } from '@hub/types';
import { syncAcquisitionDemand } from '../acquisitions/demand-bridge';
import { syncSupportDemand } from '../demands/support-bridge';
function take(data: Record<string, unknown>, names: string[]) {
  const out: Record<string, unknown> = {};
  for (const n of names) {
    if (data[n] !== undefined) out[n] = data[n];
    delete data[n];
  }
  return out;
}
@Injectable()
export class RecordHooks {
  async prepare(
    tx: Prisma.TransactionClient,
    name: string,
    id: string | undefined,
    input: Record<string, unknown>,
    user: SessionUser,
  ) {
    const data = { ...input };
    if (id && name === 'maintenance') {
      const record = await tx.maintenanceRecord.findUniqueOrThrow({
        where: { id },
        select: { sourceDemandId: true },
      });
      if (record.sourceDemandId)
        await tx.$queryRaw`SELECT "id" FROM "Demand" WHERE "id" = ${record.sourceDemandId} FOR UPDATE`;
    }
    if (id && name === 'requests')
      await tx.$queryRaw`SELECT "id" FROM "PurchaseProcess" WHERE "requestId" = ${id} ORDER BY "id" FOR UPDATE`;
    if (
      id &&
      name === 'requests' &&
      (await tx.proposal.count({ where: { process: { requestId: id } } }))
    )
      throw new BadRequestException(
        'Requisição com propostas recebidas. Preserve os itens e registre uma nova requisição.',
      );
    if (
      id &&
      name === 'proposals' &&
      (await tx.technicalAnalysis.count({ where: { proposalItem: { proposalId: id } } }))
    )
      throw new BadRequestException(
        'Proposta já analisada. Registre uma nova proposta para preservar a evidência original.',
      );
    if (
      id &&
      name === 'commitments' &&
      (await tx.technicalInspection.count({ where: { commitmentId: id } }))
    )
      throw new BadRequestException(
        'Empenho já conferido. Seus vínculos e itens devem permanecer preservados.',
      );
    if (id && name === 'acquisitions') {
      const existing = await tx.purchaseProcess.findUniqueOrThrow({ where: { id } });
      if (
        data.requestId &&
        data.requestId !== existing.requestId &&
        (await tx.proposal.count({ where: { processId: id } }))
      )
        throw new BadRequestException(
          'O processo possui propostas. Não é possível trocar a requisição.',
        );
    }
    if (!id && ['knowledge', 'recommendations', 'solutions'].includes(name) && !data.tags)
      data.tags = [];
    if (name === 'equipment') {
      const network = take(data, ['ip']);
      const hardware = take(data, ['cpu', 'ram', 'storage', 'os']);
      if (Object.keys(network).length)
        data.equipmentNetwork_equipment = id
          ? { upsert: { create: network, update: network } }
          : { create: network };
      if (Object.keys(hardware).length)
        data.equipmentHardware_equipment = id
          ? { upsert: { create: hardware, update: hardware } }
          : { create: hardware };
    }
    if (['analyses', 'inspections'].includes(name) || (name === 'maintenance' && !id))
      data.technicianId = user.id;
    if (name === 'maintenance' && data.equipmentId === '') data.equipmentId = null;
    if (['knowledge', 'recommendations', 'scripts'].includes(name) && !id) data.authorId = user.id;
    if (['specifications', 'requests', 'acquisitions'].includes(name) && !id)
      data.responsibleId = user.id;
    if (name === 'documents') {
      const existing = id ? await tx.documentReference.findUniqueOrThrow({ where: { id } }) : null;
      const targetType = String(data.entityType ?? existing?.entityType),
        targetId = String(data.entityId ?? existing?.entityId);
      const allowed: Record<string, string> = {
        equipment: 'equipment',
        maintenance: 'maintenanceRecord',
        knowledge: 'knowledgeArticle',
        recommendations: 'technicalRecommendation',
        demands: 'demand',
        requests: 'purchaseRequest',
        specifications: 'technicalSpecification',
        acquisitions: 'purchaseProcess',
        suppliers: 'supplier',
        proposals: 'proposal',
        analyses: 'technicalAnalysis',
        commitments: 'commitment',
        inspections: 'technicalInspection',
      };
      const permission =
        targetType === 'demands'
          ? 'demands'
          : targetType === 'analyses'
            ? 'analysis'
            : targetType === 'inspections'
              ? 'inspection'
              : ['equipment', 'maintenance', 'knowledge', 'recommendations'].includes(targetType)
                ? targetType === 'recommendations'
                  ? 'knowledge'
                  : targetType
                : 'acquisition';
      if (!user.permissions.includes(permission + '.read'))
        throw new BadRequestException('Vínculo não autorizado.');
      const model = (
        tx as unknown as Record<string, { findUnique: (a: unknown) => Promise<unknown> }>
      )[allowed[targetType]];
      if (!model || !(await model.findUnique({ where: { id: targetId } })))
        throw new BadRequestException('Registro relacionado não encontrado.');
      if (!id) data.createdById = user.id;
    }
    if (name === 'knowledge' || name === 'specifications') {
      const content = data.content;
      delete data.content;
      const requirements = data.requirements;
      delete data.requirements;
      if (requirements !== undefined && content === undefined)
        throw new BadRequestException(
          'Ao alterar requisitos, informe também o conteúdo da nova versão do descritivo.',
        );
      if (content !== undefined) {
        const latest = id
          ? name === 'knowledge'
            ? await tx.knowledgeArticleVersion.findFirst({
                where: { articleId: id },
                orderBy: { version: 'desc' },
              })
            : await tx.specificationVersion.findFirst({
                where: { specificationId: id },
                orderBy: { version: 'desc' },
              })
          : null;
        const version = {
          version: (latest?.version ?? 0) + 1,
          content,
          ...(name === 'knowledge'
            ? { authorId: user.id }
            : {
                specificationRequirement_version: {
                  create:
                    requirements === undefined && id && latest
                      ? (
                          await tx.specificationRequirement.findMany({
                            where: { versionId: latest.id },
                          })
                        ).map(({ group, field, operator, value, unit, valueType }) => ({
                          group,
                          field,
                          operator,
                          value,
                          unit,
                          valueType,
                        }))
                      : this.requirements(String(requirements ?? '')),
                },
              }),
        };
        data[
          name === 'knowledge'
            ? 'knowledgeArticleVersion_article'
            : 'specificationVersion_specification'
        ] = { create: version };
      }
    }
    if (name === 'requests') {
      const item = take(data, ['specificationVersionId', 'quantity']);
      if (Object.keys(item).length) {
        const existing = id
          ? await tx.purchaseRequestItem.findFirst({ where: { requestId: id } })
          : null;
        const values = {
          ...item,
          description: data.object ?? existing?.description ?? 'Item adicional',
        };
        data.purchaseRequestItem_request = existing
          ? { update: { where: { id: existing.id }, data: values } }
          : { create: values };
      }
    }
    if (name === 'proposals') {
      const parent = id ? await tx.proposal.findUniqueOrThrow({ where: { id } }) : null;
      if (
        parent &&
        ((data.processId !== undefined && data.processId !== parent.processId) ||
          (data.supplierId !== undefined && data.supplierId !== parent.supplierId))
      )
        throw new BadRequestException(
          'Para trocar processo ou fornecedor, registre uma nova proposta.',
        );
      const item = take(data, [
        'requestItemId',
        'brand',
        'model',
        'manufacturer',
        'quantity',
        'price',
        'offeredDescription',
        'manufacturerUrl',
      ]);
      if (Object.keys(item).length) {
        const existing = id ? await tx.proposalItem.findFirst({ where: { proposalId: id } }) : null;
        const processId = data.processId ?? parent?.processId;
        await tx.$queryRaw`SELECT "id" FROM "PurchaseProcess" WHERE "id" = ${String(processId)} FOR UPDATE`;
        const process = await tx.purchaseProcess.findUnique({
          where: { id: String(processId) },
        });
        const requested = await tx.purchaseRequestItem.findUnique({
          where: { id: String(item.requestItemId ?? existing?.requestItemId) },
        });
        if (!process || requested?.requestId !== process.requestId)
          throw new BadRequestException('O item não pertence à requisição do processo.');
        data.proposalItem_proposal = existing
          ? { update: { where: { id: existing.id }, data: item } }
          : { create: item };
      }
    }
    if (name === 'analyses') {
      await tx.$queryRaw`SELECT "id" FROM "PurchaseProcess" WHERE "id" = ${String(data.processId)} FOR UPDATE`;
      const item = await tx.proposalItem.findUnique({
        where: { id: String(data.proposalItemId) },
        include: { proposal: true, requestItem: true },
      });
      if (
        !item ||
        item.proposal.processId !== data.processId ||
        item.requestItem.specificationVersionId !== data.specificationVersionId
      )
        throw new BadRequestException(
          'Processo, produto e versão do descritivo devem corresponder ao item requisitado.',
        );
      const requirements = await tx.specificationRequirement.findMany({
        where: { versionId: String(data.specificationVersionId) },
      });
      if (!requirements.length)
        throw new BadRequestException('O descritivo precisa de requisitos estruturados.');
      data.analysisRequirementResult_analysis = {
        create: requirements.map((r) => ({ requirementId: r.id, result: 'PENDENTE' })),
      };
    }
    if (name === 'commitments') {
      const parent = id ? await tx.commitment.findUniqueOrThrow({ where: { id } }) : null;
      if (
        parent &&
        ['processId', 'requestId', 'supplierId'].some(
          (key) => data[key] !== undefined && data[key] !== parent[key as keyof typeof parent],
        )
      )
        throw new BadRequestException('Para trocar os vínculos, registre um novo empenho.');
      const item = take(data, ['proposalItemId', 'quantity', 'value']);
      if (Object.keys(item).length) {
        const existing = id
          ? await tx.commitmentItem.findFirst({ where: { commitmentId: id } })
          : null;
        const processId = data.processId ?? parent?.processId;
        const proposalItem = await tx.proposalItem.findUnique({
          where: { id: String(item.proposalItemId ?? existing?.proposalItemId) },
          include: { proposal: true },
        });
        const process = await tx.purchaseProcess.findUnique({
          where: { id: String(processId) },
        });
        if (
          !proposalItem ||
          proposalItem.proposal.processId !== processId ||
          proposalItem.proposal.supplierId !== (data.supplierId ?? parent?.supplierId) ||
          process?.requestId !== (data.requestId ?? parent?.requestId)
        )
          throw new BadRequestException(
            'Os vínculos do empenho devem corresponder à proposta e à requisição.',
          );
        data.commitmentItem_commitment = existing
          ? { update: { where: { id: existing.id }, data: item } }
          : { create: item };
      }
    }
    if (name === 'inspections') {
      const items = await tx.commitmentItem.findMany({
        where: { commitmentId: String(data.commitmentId) },
      });
      if (!items.length) throw new BadRequestException('Empenho sem itens.');
      data.inspectionItem_inspection = {
        create: items.map((i) => ({
          commitmentItemId: i.id,
          deliveredDescription: '',
          verifiedCharacteristics: '',
          divergences: '',
          result: 'PENDENTE',
        })),
      };
    }
    return data;
  }
  requirements(value: string) {
    const rows = value
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [group, field, operator, val, unit = '', valueType = 'texto'] = line
          .split('|')
          .map((v) => v.trim());
        if (!group || !field || !operator || !val)
          throw new BadRequestException(
            'Requisito inválido. Use grupo | campo | operador | valor | unidade | tipo.',
          );
        return { group, field, operator, value: val, unit, valueType };
      });
    if (!rows.length) throw new BadRequestException('Informe pelo menos um requisito.');
    return rows;
  }
  async afterSave(
    tx: Prisma.TransactionClient,
    name: string,
    item: { id: string; [key: string]: unknown },
    before: unknown,
    input: Record<string, unknown>,
    user: SessionUser,
  ) {
    if (name === 'demands') {
      await syncAcquisitionDemand(tx, item.id, user.id);
      await syncSupportDemand(tx, item.id, user.id);
    }
    if (name === 'maintenance' && item.sourceDemandId) {
      await tx.demand.update({
        where: { id: String(item.sourceDemandId) },
        data: { status: String(item.status), notes: String(item.notes ?? '') },
      });
      if (before)
        await tx.maintenanceAction.create({
          data: {
            recordId: item.id,
            description: `Atendimento atualizado por ${user.name}. Situação: ${item.status}.`,
          },
        });
    }
    if (name === 'equipment' && before && (before as { status: string }).status !== item.status)
      await tx.equipmentStatusHistory.create({
        data: {
          equipmentId: item.id,
          userId: user.id,
          previousStatus: (before as { status: string }).status,
          status: String(item.status),
          reason: 'Alteração manual pela equipe',
        },
      });
    let processId: string | undefined;
    if (name === 'acquisitions') processId = item.id;
    if (['proposals', 'analyses', 'commitments'].includes(name)) processId = String(item.processId);
    if (name === 'inspections') {
      const commitment = await tx.commitment.findUnique({
        where: { id: String(item.commitmentId) },
      });
      processId = commitment?.processId;
    }
    if (processId)
      await tx.timelineEvent.create({
        data: {
          entityType: 'acquisitions',
          entityId: processId,
          processId,
          eventType: before ? 'UPDATED' : 'CREATED',
          title: `${{ acquisitions: 'Processo', proposals: 'Proposta', analyses: 'Análise técnica', commitments: 'Empenho', inspections: 'Conferência' }[name]} ${before ? 'atualizado' : 'registrado'}`,
          description: String(input.notes ?? input.title ?? ''),
          supplierId: typeof item.supplierId === 'string' ? item.supplierId : undefined,
          userId: user.id,
        },
      });
  }
}

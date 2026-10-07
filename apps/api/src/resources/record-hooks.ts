import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SessionUser } from '@hub/types';
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
    if (id && name === 'requests' && (await tx.purchaseProcess.count({ where: { requestId: id } })))
      throw new BadRequestException(
        'Requisição vinculada a processo. Preserve os itens e registre uma nova requisição.',
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
    if (['maintenance', 'analyses', 'inspections'].includes(name)) data.technicianId = user.id;
    if (['knowledge', 'recommendations', 'scripts'].includes(name) && !id) data.authorId = user.id;
    if (['specifications', 'requests', 'acquisitions'].includes(name) && !id)
      data.responsibleId = user.id;
    if (name === 'documents') {
      const targetType = String(data.entityType),
        targetId = String(data.entityId);
      const allowed: Record<string, string> = {
        equipment: 'equipment',
        maintenance: 'maintenanceRecord',
        knowledge: 'knowledgeArticle',
        recommendations: 'technicalRecommendation',
        acquisitions: 'purchaseProcess',
        suppliers: 'supplier',
        proposals: 'proposal',
        analyses: 'technicalAnalysis',
        commitments: 'commitment',
        inspections: 'technicalInspection',
      };
      const permission =
        targetType === 'analyses'
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
      data.createdById = user.id;
    }
    if (name === 'knowledge' || name === 'specifications') {
      const content = data.content;
      delete data.content;
      const requirements = data.requirements;
      delete data.requirements;
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
                  create: this.requirements(String(requirements ?? '')),
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
        const values = { ...item, description: data.object ?? 'Item adicional' };
        data.purchaseRequestItem_request = existing
          ? { update: { where: { id: existing.id }, data: values } }
          : { create: values };
      }
    }
    if (name === 'proposals') {
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
        const process = await tx.purchaseProcess.findUnique({
          where: { id: String(data.processId) },
        });
        const requested = await tx.purchaseRequestItem.findUnique({
          where: { id: String(item.requestItemId) },
        });
        if (!process || requested?.requestId !== process.requestId)
          throw new BadRequestException('O item não pertence à requisição do processo.');
        const existing = id ? await tx.proposalItem.findFirst({ where: { proposalId: id } }) : null;
        data.proposalItem_proposal = existing
          ? { update: { where: { id: existing.id }, data: item } }
          : { create: item };
      }
    }
    if (name === 'analyses') {
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
      const item = take(data, ['proposalItemId', 'quantity', 'value']);
      if (Object.keys(item).length) {
        const proposalItem = await tx.proposalItem.findUnique({
          where: { id: String(item.proposalItemId) },
          include: { proposal: true },
        });
        const process = await tx.purchaseProcess.findUnique({
          where: { id: String(data.processId) },
        });
        if (
          !proposalItem ||
          proposalItem.proposal.processId !== data.processId ||
          proposalItem.proposal.supplierId !== data.supplierId ||
          process?.requestId !== data.requestId
        )
          throw new BadRequestException(
            'Os vínculos do empenho devem corresponder à proposta e à requisição.',
          );
        const existing = id
          ? await tx.commitmentItem.findFirst({ where: { commitmentId: id } })
          : null;
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

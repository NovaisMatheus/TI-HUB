import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@hub/types';
import { PrismaService } from '../common/prisma.service';
import { canConclude, resultSchema, validate } from '../common/validation';
import { z } from 'zod';
@Injectable()
export class WorkflowService {
  constructor(private readonly db: PrismaService) {}
  async evaluateAnalysis(id: string, input: unknown, user: SessionUser) {
    const data = validate(
      z
        .object({
          resultId: z.string(),
          result: resultSchema,
          offered: z.string().max(10000),
          reason: z.string().max(10000),
          equivalenceNotes: z.string().max(10000).default(''),
          referenceUrls: z
            .array(
              z
                .string()
                .max(2048)
                .refine((value) => {
                  try {
                    const url = new URL(value);
                    return (
                      ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
                    );
                  } catch {
                    return false;
                  }
                }, 'Referência deve ser uma URL http ou https válida.'),
            )
            .max(20)
            .optional(),
        })
        .strict(),
      input,
    );
    if (data.result === 'DIVERGENCIA' && !data.reason.trim())
      throw new BadRequestException('Registre o motivo da divergência.');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TechnicalAnalysis" WHERE "id" = ${id} FOR UPDATE`;
      const analysis = await tx.technicalAnalysis.findUnique({ where: { id } });
      if (!analysis) throw new NotFoundException();
      if (analysis.concludedAt) throw new BadRequestException('Análise já concluída.');
      const before = await tx.analysisRequirementResult.findUnique({
        where: { id: data.resultId },
      });
      if (before?.analysisId !== id) throw new BadRequestException('Requisito inválido.');
      const { resultId, ...values } = data;
      const after = await tx.analysisRequirementResult.update({
        where: { id: resultId },
        data: values,
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'EVALUATE',
          entityType: 'analyses',
          entityId: id,
          before: JSON.parse(JSON.stringify(before)),
          after: JSON.parse(JSON.stringify(after)),
        },
      });
      return after;
    });
  }
  async conclude(id: string, input: unknown, user: SessionUser) {
    const data = validate(
      z.object({ conclusion: resultSchema, notes: z.string().min(1).max(10000) }).strict(),
      input,
    );
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TechnicalAnalysis" WHERE "id" = ${id} FOR UPDATE`;
      const before = await tx.technicalAnalysis.findUnique({
        where: { id },
        include: {
          analysisRequirementResult_analysis: true,
          proposalItem: { include: { proposal: true } },
        },
      });
      if (!before) throw new NotFoundException();
      if (before.concludedAt) throw new BadRequestException('Análise já concluída.');
      if (
        !canConclude(
          before.analysisRequirementResult_analysis.map((r) => r.result),
          data.conclusion,
        )
      )
        throw new BadRequestException(
          'Não é possível concluir ATENDE com requisitos pendentes ou divergentes.',
        );
      const after = await tx.technicalAnalysis.update({
        where: { id },
        data: { ...data, status: 'CONCLUIDA', concludedAt: new Date(), technicianId: user.id },
      });
      await tx.timelineEvent.create({
        data: {
          entityType: 'acquisitions',
          entityId: before.processId,
          processId: before.processId,
          supplierId: before.proposalItem.proposal.supplierId,
          userId: user.id,
          eventType: 'ANALYSIS_CONCLUDED',
          title: 'Análise concluída pelo técnico',
          description: data.notes,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CONCLUDE',
          entityType: 'analyses',
          entityId: id,
          before: JSON.parse(JSON.stringify(before)),
          after: JSON.parse(JSON.stringify(after)),
        },
      });
      return after;
    });
  }
  async inspect(id: string, input: unknown, user: SessionUser) {
    const data = validate(
      z
        .object({
          itemId: z.string(),
          result: resultSchema,
          deliveredDescription: z.string().min(1).max(10000),
          verifiedCharacteristics: z.string().min(1).max(10000),
          divergences: z.string().max(10000),
        })
        .strict(),
      input,
    );
    if (data.result === 'DIVERGENCIA' && !data.divergences.trim())
      throw new BadRequestException('Descreva a divergência.');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TechnicalInspection" WHERE "id" = ${id} FOR UPDATE`;
      const before = await tx.inspectionItem.findUnique({ where: { id: data.itemId } });
      if (before?.inspectionId !== id) throw new BadRequestException('Item inválido.');
      const { itemId, ...values } = data;
      const after = await tx.inspectionItem.update({ where: { id: itemId }, data: values });
      const items = await tx.inspectionItem.findMany({ where: { inspectionId: id } });
      const result = items.some((i) => i.result === 'DIVERGENCIA')
        ? 'DIVERGENCIA'
        : items.some((i) => i.result === 'PENDENTE')
          ? 'PENDENTE'
          : 'ATENDE';
      const inspection = await tx.technicalInspection.update({
        where: { id },
        data: { result },
        include: { commitment: true },
      });
      await tx.timelineEvent.create({
        data: {
          entityType: 'acquisitions',
          entityId: inspection.commitment.processId,
          processId: inspection.commitment.processId,
          supplierId: inspection.commitment.supplierId,
          userId: user.id,
          eventType: 'INSPECTION_RECORDED',
          title: 'Conferência técnica registrada',
          description: values.deliveredDescription + ' · ' + result,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'INSPECT',
          entityType: 'inspections',
          entityId: id,
          before: JSON.parse(JSON.stringify(before)),
          after: JSON.parse(JSON.stringify(after)),
        },
      });
      return after;
    });
  }
}

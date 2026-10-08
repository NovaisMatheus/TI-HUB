import { BadRequestException, Body, Controller, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { AuthRequest, Permission } from '../auth/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { validate } from '../common/validation';
import { RecordHooks } from '../resources/record-hooks';
import { syncAcquisitionDemand } from './demand-bridge';

@Controller('acquisitions')
export class AcquisitionController {
  constructor(
    private readonly db: PrismaService,
    private readonly hooks: RecordHooks,
  ) {}

  @Permission('acquisition.write')
  @Post('sync-demands')
  async sync(@Req() req: AuthRequest) {
    const demands = await this.db.demand.findMany({
      where: { kind: 'AQUISICAO' },
      select: { id: true },
    });
    for (const demand of demands)
      await this.db.$transaction((tx) => syncAcquisitionDemand(tx, demand.id, req.user.id), {
        maxWait: 10000,
        timeout: 60000,
      });
    return { synchronized: demands.length };
  }

  @Permission('acquisition.write')
  @Post(':id/specification')
  async specification(@Param('id') id: string, @Body() input: unknown, @Req() req: AuthRequest) {
    const data = validate(
      z
        .object({
          content: z.string().trim().min(1).max(200000),
          requirements: z.string().trim().min(1).max(100000),
          quantity: z.number().int().positive(),
          departmentId: z.string().min(1).optional(),
        })
        .strict(),
      input,
    );
    const requirements = this.hooks.requirements(data.requirements);
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "PurchaseProcess" WHERE "id" = ${id} FOR UPDATE`;
        const process = await tx.purchaseProcess.findUniqueOrThrow({
          where: { id },
          include: {
            request: {
              include: { purchaseRequestItem_request: { include: { specificationVersion: true } } },
            },
          },
        });
        if (await tx.technicalAnalysis.count({ where: { processId: id } }))
          throw new BadRequestException(
            'Já existem análises utilizando os itens desta requisição. Preserve a versão analisada; registre outra requisição para alterar os requisitos.',
          );
        const item = process.request.purchaseRequestItem_request[0];
        if (!item || process.request.purchaseRequestItem_request.length !== 1)
          throw new BadRequestException(
            'Esta revisão atende requisição com um item. Edite uma requisição apropriada para processos com múltiplos itens.',
          );
        const latest = await tx.specificationVersion.findFirstOrThrow({
          where: { specificationId: item.specificationVersion.specificationId },
          orderBy: { version: 'desc' },
        });
        const version = await tx.specificationVersion.create({
          data: {
            specificationId: latest.specificationId,
            version: latest.version + 1,
            content: data.content,
            specificationRequirement_version: { create: requirements },
          },
        });
        await tx.technicalSpecification.update({
          where: { id: latest.specificationId },
          data: { status: 'VIGENTE' },
        });
        await tx.purchaseRequestItem.update({
          where: { id: item.id },
          data: { quantity: data.quantity, specificationVersionId: version.id },
        });
        await tx.purchaseRequest.update({
          where: { id: process.requestId },
          data: {
            status: 'EM_ANALISE',
            ...(data.departmentId ? { departmentId: data.departmentId } : {}),
          },
        });
        if (process.status === 'A_CONFERIR')
          await tx.purchaseProcess.update({
            where: { id },
            data: { status: 'AGUARDANDO_PROPOSTA' },
          });
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'REVIEW_IMPORTED_SPECIFICATION',
            entityType: 'acquisitions',
            entityId: id,
            before: {
              specificationVersionId: item.specificationVersionId,
              quantity: item.quantity,
            },
            after: { specificationVersionId: version.id, quantity: data.quantity },
          },
        });
        await tx.timelineEvent.create({
          data: {
            processId: id,
            entityType: 'acquisitions',
            entityId: id,
            userId: req.user.id,
            eventType: 'SPECIFICATION_REVIEWED',
            title: 'Descritivo conferido pela equipe',
            description: `Versão ${version.version}; ${requirements.length} requisitos; quantidade ${data.quantity}.`,
          },
        });
        return { specificationVersionId: version.id, requirements: requirements.length };
      },
      { maxWait: 10000, timeout: 60000 },
    );
  }
}

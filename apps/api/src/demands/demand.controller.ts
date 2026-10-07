import { Body, Controller, Delete, Get, Post, Req, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { AuthRequest, ExtensionAllowed, Permission } from '../auth/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { validate } from '../common/validation';
import { oneDocImportSchema } from './import.schema';
import { json } from '../resources/resource.service';

@Controller()
export class DemandController {
  constructor(private readonly db: PrismaService) {}

  @Permission('demands.write')
  @Post('extension/credentials')
  async issue(@Req() req: AuthRequest) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 86400000);
    const credential = await this.db.extensionCredential.create({
      data: {
        userId: req.user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt,
      },
    });
    return { id: credential.id, token, expiresAt };
  }
  @Permission('demands.write')
  @Get('extension/credentials')
  credentials(@Req() req: AuthRequest) {
    return this.db.extensionCredential.findMany({
      where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  @Permission('demands.write')
  @Delete('extension/credentials/:id')
  async revoke(@Param('id') id: string, @Req() req: AuthRequest) {
    await this.db.extensionCredential.updateMany({
      where: { id, userId: req.user.id },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
  @ExtensionAllowed()
  @Permission('demands.write')
  @Get('extension/session')
  session(@Req() req: AuthRequest) {
    return { name: req.user.name };
  }

  @ExtensionAllowed()
  @Permission('demands.write')
  @Get('extension/demand')
  async lookup(@Query() query: unknown) {
    const identity = validate(
      z
        .object({
          sourceUrl: oneDocImportSchema.shape.sourceUrl,
          sourceId: oneDocImportSchema.shape.sourceId,
        })
        .strict(),
      query,
    );
    const demand = await this.db.demand.findUnique({
      where: {
        sourceHost_sourceId: {
          sourceHost: new URL(identity.sourceUrl).hostname,
          sourceId: identity.sourceId,
        },
      },
      select: { id: true, kind: true, title: true },
    });
    return { exists: !!demand, demand };
  }

  @ExtensionAllowed()
  @Permission('demands.write')
  @Post('imports/1doc')
  async collect(@Body() body: unknown, @Req() req: AuthRequest) {
    const payload = validate(oneDocImportSchema, body);
    const sourceUrl = new URL(payload.sourceUrl);
    sourceUrl.hash = '';
    // Keep only document routing parameters, never a page's authentication tokens.
    for (const key of [...sourceUrl.searchParams.keys()])
      if (!['pg', 'itd', 'id', 'id_emissao', 'hash', 'codigo', 's'].includes(key))
        sourceUrl.searchParams.delete(key);
    const safe = { ...payload, sourceUrl: sourceUrl.href };
    const result = await this.db.$transaction(
      async (tx) => {
        const existing = await tx.demand.findUnique({
          where: {
            sourceHost_sourceId: { sourceHost: sourceUrl.hostname, sourceId: payload.sourceId },
          },
        });
        const row = await tx.demand.upsert({
          where: {
            sourceHost_sourceId: { sourceHost: sourceUrl.hostname, sourceId: payload.sourceId },
          },
          create: {
            kind: payload.kind ?? 'SUPORTE',
            sourceHost: sourceUrl.hostname,
            sourceId: payload.sourceId,
            sourceUrl: sourceUrl.href,
            number: payload.number,
            documentType: payload.documentType,
            title: payload.title,
            description: payload.description,
            requester: payload.requester,
            sourceStatus: payload.sourceStatus,
            capturedAt: new Date(payload.capturedAt),
            metadata: json(safe),
          },
          update: {
            ...(payload.kind ? { kind: payload.kind } : {}),
            sourceUrl: sourceUrl.href,
            number: payload.number,
            documentType: payload.documentType,
            title: payload.title,
            description: payload.description,
            requester: payload.requester,
            sourceStatus: payload.sourceStatus,
            capturedAt: new Date(payload.capturedAt),
            metadata: json(safe),
          },
        });
        for (const dispatch of payload.dispatches) {
          const previous = !dispatch.content
            ? await tx.demandDispatch.findUnique({
                where: {
                  demandId_sourceId: { demandId: row.id, sourceId: dispatch.sourceId },
                },
              })
            : null;
          const data = {
            sequence: dispatch.sequence,
            title: dispatch.title,
            author: dispatch.author,
            dateLabel: dispatch.dateLabel,
            content: dispatch.content || previous?.content || '',
            metadata: previous?.content ? (previous.metadata ?? json(dispatch)) : json(dispatch),
          };
          await tx.demandDispatch.upsert({
            where: { demandId_sourceId: { demandId: row.id, sourceId: dispatch.sourceId } },
            create: { demandId: row.id, sourceId: dispatch.sourceId, ...data },
            update: data,
          });
        }
        await tx.demandSnapshot.create({
          data: {
            demandId: row.id,
            capturedBy: req.user.id,
            capturedAt: new Date(payload.capturedAt),
            payload: json(safe),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: existing ? 'IMPORT_UPDATE' : 'IMPORT_CREATE',
            entityType: 'demands',
            entityId: row.id,
            after: { source: '1doc', dispatches: payload.dispatches.length },
            sessionIp: req.ip,
          },
        });
        return {
          id: row.id,
          created: !existing,
          dispatches: await tx.demandDispatch.count({ where: { demandId: row.id } }),
        };
      },
      { maxWait: 10000, timeout: 60000 },
    );
    return { ...result, href: `/demands/${result.id}`, warnings: payload.warnings };
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthRequest, Permission } from '../auth/auth.guard';
import { ResourceService, json } from './resource.service';
import { catalog } from './catalog';
import { PrismaService } from '../common/prisma.service';
import { validate } from '../common/validation';
import { WorkflowService } from '../acquisitions/workflow.service';
import { SearchService } from '../search/search.service';
import {
  AIProviderRegistry,
  MockRemoteAccessProvider,
  MockGLPIProvider,
} from '../integrations/providers';
import { ConnectionService } from '../equipment/connection.service';
import { canAccess } from './access';
import type { Source } from '@hub/types';
@Controller()
export class ResourceController {
  constructor(
    private readonly service: ResourceService,
    private readonly db: PrismaService,
    private readonly workflow: WorkflowService,
    private readonly search: SearchService,
    private readonly connectionService: ConnectionService,
  ) {}
  @Get('catalog') catalog(@Req() req: AuthRequest) {
    return Object.fromEntries(
      Object.entries(catalog).filter(([name]) => canAccess(name, req.user)),
    );
  }
  @Get('dashboard') async dashboard(@Req() req: AuthRequest) {
    const allowed = (key: string) => req.user.permissions.includes(key + '.read');
    const [equipment, maintenance, processes, analyses, inspections, pops, recommendations] =
      await Promise.all([
        allowed('equipment') ? this.db.equipment.count() : 0,
        allowed('equipment')
          ? this.db.equipment.count({
              where: { status: { in: ['EM_MANUTENCAO', 'EM_DIAGNOSTICO', 'AGUARDANDO_PECA'] } },
            })
          : 0,
        allowed('acquisition')
          ? this.db.purchaseProcess.findMany({
              where: { status: { not: 'CONCLUIDO' } },
              include: { request: { include: { department: true } } },
              take: 5,
              orderBy: { updatedAt: 'desc' },
            })
          : [],
        allowed('analysis')
          ? this.db.technicalAnalysis.count({ where: { status: 'EM_ANALISE' } })
          : 0,
        allowed('inspection')
          ? this.db.technicalInspection.count({ where: { result: 'PENDENTE' } })
          : 0,
        allowed('knowledge')
          ? this.db.knowledgeArticle.findMany({ take: 4, orderBy: { updatedAt: 'desc' } })
          : [],
        allowed('knowledge')
          ? this.db.technicalRecommendation.findMany({ take: 3, orderBy: { updatedAt: 'desc' } })
          : [],
      ]);
    return { equipment, maintenance, processes, analyses, inspections, pops, recommendations };
  }
  @Get('search') searchRecords(@Query('q') q: string, @Req() req: AuthRequest) {
    return this.search.search((q ?? '').slice(0, 500), req.user);
  }
  @Permission('ai.read') @Post('ai/ask') async ask(@Body() body: unknown, @Req() req: AuthRequest) {
    const data = validate(
      z
        .object({ question: z.string().min(3).max(2000), conversationId: z.string().optional() })
        .strict(),
      body,
    );
    const config = await this.db.aIConfiguration.findUnique({ where: { userId: req.user.id } });
    if (config && !config.enabled)
      throw new BadRequestException('Assistente desativado no perfil.');
    const sources = await this.search.search(data.question, req.user, true);
    const result = await new AIProviderRegistry()
      .get('mock')
      .chat(data.question, sources.slice(0, 6));
    const conversation = data.conversationId
      ? await this.db.aIConversation.findFirst({
          where: { id: data.conversationId, userId: req.user.id, archived: false },
        })
      : await this.db.aIConversation.create({
          data: {
            userId: req.user.id,
            title: data.question.slice(0, 80),
            provider: 'mock',
            model: 'retrieval-mock',
          },
        });
    if (!conversation) throw new NotFoundException();
    await this.db.aIMessage.createMany({
      data: [
        { conversationId: conversation.id, role: 'user', content: data.question },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: result.answer,
          sources: json(result.sources),
        },
      ],
    });
    return { ...result, conversationId: conversation.id };
  }
  @Permission('ai.read') @Get('ai/conversations') async conversations(@Req() req: AuthRequest) {
    const rows = await this.db.aIConversation.findMany({
      where: { userId: req.user.id, archived: false },
      include: { aIMessage_conversation: { orderBy: { createdAt: 'asc' }, take: 100 } },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        aIMessage_conversation: await Promise.all(
          row.aIMessage_conversation.map(async (message) => {
            if (message.role !== 'assistant' || !Array.isArray(message.sources)) return message;
            const sources = message.sources as unknown as Source[];
            const permitted = await Promise.all(
              sources.map((s) => this.search.authorized(s, req.user)),
            );
            return permitted.every(Boolean)
              ? message
              : {
                  ...message,
                  content:
                    'Resposta anterior indisponível: as fontes ou permissões mudaram. Faça uma nova pesquisa.',
                  sources: [],
                };
          }),
        ),
      })),
    );
  }
  @Permission('ai.read') @Patch('ai/conversations/:id') async conversation(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ) {
    const data = validate(
      z
        .object({ title: z.string().min(1).max(100).optional(), archived: z.boolean().optional() })
        .strict(),
      body,
    );
    const row = await this.db.aIConversation.findFirst({ where: { id, userId: req.user.id } });
    if (!row) throw new NotFoundException();
    return this.db.aIConversation.update({ where: { id }, data });
  }
  @Get('profile') async profile(@Req() req: AuthRequest) {
    const config = await this.db.aIConfiguration.findUnique({
      where: { userId: req.user.id },
      select: { provider: true, model: true, enabled: true },
    });
    return { ai: config ?? { provider: 'mock', model: 'retrieval-mock', enabled: true } };
  }
  @Patch('profile') async updateProfile(@Req() req: AuthRequest, @Body() body: unknown) {
    const data = validate(
      z
        .object({
          theme: z.enum(['light', 'dark', 'system']).optional(),
          aiEnabled: z.boolean().optional(),
        })
        .strict(),
      body,
    );
    if (data.theme)
      await this.db.user.update({ where: { id: req.user.id }, data: { theme: data.theme } });
    if (data.aiEnabled !== undefined)
      await this.db.aIConfiguration.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, enabled: data.aiEnabled },
        update: { enabled: data.aiEnabled },
      });
    return { success: true };
  }
  @Permission('admin.audit.read') @Get('audit') async audit(
    @Query() query: Record<string, string>,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const where = query.q
      ? { OR: [{ entityType: { contains: query.q } }, { action: { contains: query.q } }] }
      : {};
    return {
      items: await this.db.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      total: await this.db.auditLog.count({ where }),
      page,
      pageSize: 20,
    };
  }
  @Permission('admin.audit.read') @Get('integrations') integrations() {
    return {
      providers: [
        { name: 'GLPI', mode: 'MOCK', description: 'Inventário via InventoryProvider' },
        {
          name: 'Google Drive / Docs',
          mode: 'MOCK',
          description: 'Referências documentais, OAuth futuro',
        },
        { name: 'IA', mode: 'MOCK', description: 'Recuperação autorizada com fontes' },
        { name: 'RDP / VNC / SMB', mode: 'MOCK', description: 'Contrato de launcher local' },
      ],
    };
  }
  @Get('lookups/:name') lookup(@Param('name') name: string, @Req() req: AuthRequest) {
    return this.service.lookup(name, req.user);
  }
  @Permission('analysis.write') @Patch('analyses/:id/evaluate') evaluate(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ) {
    return this.workflow.evaluateAnalysis(id, body, req.user);
  }
  @Permission('analysis.write') @Post('analyses/:id/conclude') conclude(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ) {
    return this.workflow.conclude(id, body, req.user);
  }
  @Permission('inspection.write') @Patch('inspections/:id/evaluate') inspect(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ) {
    return this.workflow.inspect(id, body, req.user);
  }
  @Permission('knowledge.write') @Post('recommendations/:id/feedback') async feedback(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ) {
    const data = validate(
      z
        .object({
          result: z.enum(['FUNCIONOU', 'PARCIALMENTE', 'NAO_RESOLVEU', 'NAO_SE_APLICAVA']),
          notes: z.string().max(2000).default(''),
        })
        .strict(),
      body,
    );
    return this.db.$transaction(async (tx) => {
      const row = await tx.recommendationFeedback.create({
        data: { ...data, userId: req.user.id, recommendationId: id },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'FEEDBACK',
          entityType: 'recommendations',
          entityId: id,
          after: json(row),
        },
      });
      return row;
    });
  }
  @Permission('equipment.read') @Post('equipment/:id/remote') async remote(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const data = validate(z.object({ protocol: z.enum(['rdp', 'vnc', 'smb']) }).strict(), body);
    const equipment = await this.db.equipment.findUnique({ where: { id } });
    if (!equipment) throw new NotFoundException();
    return new MockRemoteAccessProvider().launch(data.protocol, equipment.hostname);
  }
  @Permission('equipment.read') @Get('equipment/:id/glpi') async glpi(@Param('id') id: string) {
    const row = await this.db.equipment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    return new MockGLPIProvider().getEquipment(row.glpiId ?? row.id);
  }
  @Permission('equipment.read') @Post('equipment/:id/connection') connection(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.connectionService.test(id, req.user.id);
  }
  @Get('records/:name') list(
    @Param('name') name: string,
    @Query() query: Record<string, string>,
    @Req() req: AuthRequest,
  ) {
    return this.service.list(name, req.user, query);
  }
  @Get('records/:name/:id') get(
    @Param('name') name: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.get(name, id, req.user);
  }
  @Post('records/:name') save(
    @Param('name') name: string,
    @Body() input: unknown,
    @Req() req: AuthRequest,
  ) {
    return this.service.save(name, undefined, input, req.user, req.ip);
  }
  @Patch('records/:name/:id') edit(
    @Param('name') name: string,
    @Param('id') id: string,
    @Body() input: unknown,
    @Req() req: AuthRequest,
  ) {
    return this.service.save(name, id, input, req.user, req.ip);
  }
}

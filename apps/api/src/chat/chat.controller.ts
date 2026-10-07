import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, Permission, Public } from '../auth/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { validate } from '../common/validation';
import { GoogleChatService, spaceIdSchema } from './google-chat.service';
export const chatMessageSchema = z
  .object({ text: z.string().trim().min(1).max(4000), requestId: z.string().uuid() })
  .strict();
@Controller('chat')
export class ChatController {
  constructor(
    private readonly db: PrismaService,
    private readonly google: GoogleChatService,
  ) {}
  @Permission('chat.read') @Get('messages') async messages(@Query('before') before?: string) {
    if (
      before &&
      (before.length > 100 || !(await this.db.teamMessage.findUnique({ where: { id: before } })))
    )
      throw new BadRequestException('Página inválida.');
    const rows = await this.db.teamMessage.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 41,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
      include: { user: { select: { name: true } } },
    });
    const items = rows.slice(0, 40);
    return { items: items.reverse(), nextCursor: rows.length > 40 ? rows[39].id : null };
  }
  @Permission('chat.write') @Post('messages') send(@Body() body: unknown, @Req() req: AuthRequest) {
    const data = validate(chatMessageSchema, body);
    return this.db.teamMessage.upsert({
      where: { requestId: `${req.user.id}:${data.requestId}` },
      update: {},
      create: { ...data, requestId: `${req.user.id}:${data.requestId}`, userId: req.user.id },
      include: { user: { select: { name: true } } },
    });
  }
  @Permission('chat.read') @Get('google/status') status(@Req() req: AuthRequest) {
    return this.google.status(req.user.id);
  }
  @Permission('chat.write') @Post('google/connect') async connect(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (
      req.headers.origin &&
      req.headers.origin !==
        new URL(
          process.env.GOOGLE_CHAT_REDIRECT_URI ?? 'http://localhost:5173/api/chat/google/callback',
        ).origin
    )
      throw new BadRequestException(
        'A autorização Google está configurada para outro endereço. Conecte sua conta no computador do Hub pelo endereço configurado ou solicite ao administrador um domínio HTTPS com OAuth para acesso pela rede. Contas já conectadas podem usar o chat pela rede.',
      );
    const { state, url } = await this.google.start(req.user.id);
    res.cookie('hub_google_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/chat/google/callback',
      maxAge: 600000,
    });
    return { url };
  }
  @Public() @Get('google/callback') async callback(
    @Query() query: Record<string, string>,
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    let success = false;
    try {
      if (query.error || !query.code || query.code.length > 4000) throw new BadRequestException();
      await this.google.complete(
        query.state ?? '',
        (req.cookies as Record<string, string>)?.hub_google_state ?? '',
        query.code,
      );
      success = true;
    } catch {
      /* Never expose OAuth credentials or Google's error response. */
    }
    res.clearCookie('hub_google_state', { path: '/api/chat/google/callback' });
    res.redirect(
      `${new URL(process.env.GOOGLE_CHAT_REDIRECT_URI ?? 'http://localhost:5173/api/chat/google/callback').origin}/?chat=${success ? 'google-connected' : 'google-error'}`,
    );
  }
  @Permission('chat.read') @Delete('google/connection') disconnect(@Req() req: AuthRequest) {
    return this.google.disconnect(req.user.id);
  }
  @Permission('chat.read') @Get('google/spaces') spaces(
    @Req() req: AuthRequest,
    @Query('pageToken') pageToken = '',
  ) {
    return this.google.request(
      req.user.id,
      `spaces?pageSize=100&pageToken=${encodeURIComponent(pageToken.slice(0, 4000))}`,
    );
  }
  @Permission('chat.read') @Get('google/spaces/:space/messages') googleMessages(
    @Param('space') space: string,
    @Req() req: AuthRequest,
    @Query('pageToken') pageToken = '',
  ) {
    const id = validate(spaceIdSchema, space);
    return this.google.request(
      req.user.id,
      `spaces/${id}/messages?pageSize=40&orderBy=createTime%20DESC&pageToken=${encodeURIComponent(pageToken.slice(0, 4000))}`,
    );
  }
  @Permission('chat.write') @Post('google/spaces/:space/messages') googleSend(
    @Param('space') space: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ) {
    const id = validate(spaceIdSchema, space),
      data = validate(chatMessageSchema, body);
    return this.google.request(
      req.user.id,
      `spaces/${id}/messages?requestId=${encodeURIComponent(data.requestId)}`,
      { text: data.text },
    );
  }
}

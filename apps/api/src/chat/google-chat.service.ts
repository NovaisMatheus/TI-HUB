import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { SecretVault } from '../integrations/secret-vault';
import { AuthService } from '../auth/auth.service';
export const googleScopes = [
  'chat.spaces.readonly',
  'chat.messages.readonly',
  'chat.messages.create',
].map((s) => `https://www.googleapis.com/auth/${s}`);
const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().positive(),
  scope: z.string().optional(),
});
export const spaceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
const googleErrorSchema = z.object({
  error: z.object({
    status: z.string().optional(),
    message: z.string().optional(),
    details: z.array(z.object({ reason: z.string().optional() }).passthrough()).optional(),
  }),
});
@Injectable()
export class GoogleChatService {
  constructor(
    private readonly db: PrismaService,
    private readonly auth: AuthService,
  ) {}
  configured() {
    return !!(
      process.env.GOOGLE_CHAT_CLIENT_ID &&
      process.env.GOOGLE_CHAT_CLIENT_SECRET &&
      process.env.GOOGLE_CHAT_REDIRECT_URI &&
      /^[a-f\d]{64}$/i.test(process.env.GOOGLE_CHAT_ENCRYPTION_KEY ?? '')
    );
  }
  private vault() {
    if (!this.configured())
      throw new BadRequestException('Google Chat ainda não foi configurado pelo administrador.');
    return new SecretVault(Buffer.from(process.env.GOOGLE_CHAT_ENCRYPTION_KEY!, 'hex'));
  }
  async status(userId: string) {
    return {
      configured: this.configured(),
      authorizationOrigin: this.configured()
        ? new URL(process.env.GOOGLE_CHAT_REDIRECT_URI!).origin
        : null,
      connected: !!(await this.db.googleChatConnection.findUnique({
        where: { userId },
        select: { id: true },
      })),
    };
  }
  async start(userId: string) {
    const vault = this.vault();
    const state = randomBytes(32).toString('hex'),
      verifier = randomBytes(48).toString('base64url');
    await this.db.googleOAuthAttempt.deleteMany({
      where: { OR: [{ userId }, { expiresAt: { lt: new Date() } }] },
    });
    await this.db.googleOAuthAttempt.create({
      data: {
        userId,
        stateHash: createHash('sha256').update(state).digest('hex'),
        verifier: vault.encrypt(verifier),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CHAT_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_CHAT_REDIRECT_URI!,
      response_type: 'code',
      scope: googleScopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    return { state, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  }
  async complete(state: string, cookieState: string, code: string) {
    if (
      !/^[a-f\d]{64}$/.test(state) ||
      state.length !== cookieState.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(cookieState))
    )
      throw new UnauthorizedException('Autorização inválida.');
    const attempt = await this.db.googleOAuthAttempt.findUnique({
      where: { stateHash: createHash('sha256').update(state).digest('hex') },
    });
    if (!attempt || attempt.expiresAt < new Date())
      throw new UnauthorizedException('Autorização expirada.');
    const consumed = await this.db.googleOAuthAttempt.deleteMany({ where: { id: attempt.id } });
    if (!consumed.count) throw new UnauthorizedException('Autorização já utilizada.');
    const user = await this.auth.user(attempt.userId);
    if (!user.permissions.includes('chat.write') || !user.permissions.includes('chat.read'))
      throw new UnauthorizedException();
    const vault = this.vault();
    const token = await this.exchange({
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_CHAT_REDIRECT_URI!,
      code_verifier: vault.decrypt(attempt.verifier),
    });
    if (!token.scope || !googleScopes.every((scope) => token.scope!.split(' ').includes(scope)))
      throw new BadRequestException('Autorize as permissões de leitura e envio do Chat.');
    const previous = await this.db.googleChatConnection.findUnique({ where: { userId: user.id } });
    const refreshToken = token.refresh_token
      ? vault.encrypt(token.refresh_token)
      : previous?.refreshToken;
    if (!refreshToken)
      throw new BadRequestException('Reconecte para permitir acesso contínuo ao Chat.');
    const data = {
      accessToken: vault.encrypt(token.access_token),
      refreshToken,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
    };
    await this.db.googleChatConnection.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
  }
  private async exchange(parameters: Record<string, string>) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        ...parameters,
        client_id: process.env.GOOGLE_CHAT_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CHAT_CLIENT_SECRET!,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new BadRequestException('Google recusou a autorização. Reconecte sua conta.');
    return tokenSchema.parse(await response.json());
  }
  async request(userId: string, path: string, data?: unknown) {
    const vault = this.vault();
    let connection = await this.db.googleChatConnection.findUnique({ where: { userId } });
    if (!connection) throw new BadRequestException('Conecte sua conta Google Chat.');
    if (connection.expiresAt.getTime() < Date.now() + 60000) {
      const refreshed = await this.exchange({
        grant_type: 'refresh_token',
        refresh_token: vault.decrypt(connection.refreshToken),
      });
      connection = await this.db.googleChatConnection.update({
        where: { userId },
        data: {
          accessToken: vault.encrypt(refreshed.access_token),
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    }
    const response = await fetch(`https://chat.googleapis.com/v1/${path}`, {
      method: data ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${vault.decrypt(connection.accessToken)}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const parsed = googleErrorSchema.safeParse(await response.json().catch(() => null));
      const error = parsed.success ? parsed.data.error : undefined;
      const safeCode = (value?: string) =>
        value && /^[A-Z][A-Z_0-9]{0,79}$/.test(value) ? value : undefined;
      const googleStatus = safeCode(error?.status);
      const reason = error?.details?.map((detail) => safeCode(detail.reason)).find(Boolean);
      // Keep tokens and arbitrary Google error contents out of logs.
      console.warn(
        JSON.stringify({
          event: 'google_chat_failed',
          operation: data ? 'send' : 'read',
          googleHttpStatus: response.status,
          googleStatus,
          reason,
        }),
      );
      let explanation =
        response.status === 401
          ? 'Sessão Google expirada. Desconecte e autorize novamente.'
          : response.status === 403
            ? 'Google não permitiu esta operação. Verifique as permissões de envio e as políticas da organização.'
            : response.status === 404
              ? 'Google não encontrou o espaço ou a configuração do aplicativo de Chat.'
              : response.status === 429
                ? 'Limite de requisições do Google atingido. Aguarde antes de tentar novamente.'
                : response.status >= 500
                  ? 'Google Chat está indisponível temporariamente.'
                  : 'Google recusou esta operação.';
      if (
        /chat app (?:not found|is not configured)|chat application (?:not found|is not configured)/i.test(
          error?.message ?? '',
        )
      )
        explanation =
          'Configure o aplicativo TI Hub em Google Cloud → Google Chat API → Configuração. A leitura pode funcionar antes dessa configuração, mas o envio exige o aplicativo configurado.';
      else if (reason === 'SERVICE_DISABLED')
        explanation = 'Ative a Google Chat API no projeto do cliente OAuth usado pelo Hub.';
      // Display only Google's message, with known credentials and token patterns redacted.
      let detail = error?.message ?? '';
      for (const secret of [
        vault.decrypt(connection.accessToken),
        process.env.GOOGLE_CHAT_CLIENT_SECRET,
        process.env.GOOGLE_CHAT_ENCRYPTION_KEY,
      ])
        if (secret) detail = detail.split(secret).join('[credencial ocultada]');
      detail = detail
        .replace(/Bearer\s+\S+/gi, 'Bearer [ocultado]')
        .split('')
        .map((character) => (character.charCodeAt(0) < 32 ? ' ' : character))
        .join('')
        .slice(0, 400);
      const code = [googleStatus, reason].filter(Boolean).join(' / ');
      const message = `${data ? 'Falha ao enviar mensagem' : 'Falha ao carregar Google Chat'}: ${explanation} (Google HTTP ${response.status}${code ? ` · ${code}` : ''})${detail ? ` Detalhe: ${detail}` : ''}`;
      // Upstream 401 must not be mistaken for an expired Hub session.
      const status = [400, 403, 404, 429].includes(response.status)
        ? response.status
        : response.status >= 500
          ? 503
          : 502;
      throw new HttpException(
        { message, googleHttpStatus: response.status, googleStatus, reason },
        status,
      );
    }
    return response.json() as Promise<Record<string, unknown>>;
  }
  async disconnect(userId: string) {
    // Only disconnect this Hub, without revoking other grants to the same Google project.
    await this.db.$transaction([
      this.db.googleChatConnection.deleteMany({ where: { userId } }),
      this.db.googleOAuthAttempt.deleteMany({ where: { userId } }),
    ]);
    return { success: true };
  }
}

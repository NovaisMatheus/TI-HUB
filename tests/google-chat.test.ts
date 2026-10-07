import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleChatService, googleScopes } from '../apps/api/src/chat/google-chat.service';
import { PrismaService } from '../apps/api/src/common/prisma.service';
import { AuthService } from '../apps/api/src/auth/auth.service';
import { SecretVault } from '../apps/api/src/integrations/secret-vault';
const key = 'ab'.repeat(32),
  vault = new SecretVault(Buffer.from(key, 'hex'));
function setup() {
  for (const [name, value] of Object.entries({
    GOOGLE_CHAT_CLIENT_ID: 'qa-client',
    GOOGLE_CHAT_CLIENT_SECRET: 'qa-secret',
    GOOGLE_CHAT_REDIRECT_URI: 'http://localhost:5173/api/chat/google/callback',
    GOOGLE_CHAT_ENCRYPTION_KEY: key,
  }))
    vi.stubEnv(name, value);
  const db = {
    googleOAuthAttempt: {
      findUnique: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn(),
    },
    googleChatConnection: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  };
  const auth = {
    user: vi.fn().mockResolvedValue({ id: 'user', permissions: ['chat.read', 'chat.write'] }),
  };
  const service = new GoogleChatService(
    db as unknown as PrismaService,
    auth as unknown as AuthService,
  );
  return { db, service };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('OAuth e acesso Google Chat', () => {
  it('gera estado de uso único e PKCE, guardando o verificador criptografado', async () => {
    const { db, service } = setup();
    const result = await service.start('user');
    expect(new URL(result.url).searchParams.get('code_challenge_method')).toBe('S256');
    const saved = db.googleOAuthAttempt.create.mock.calls[0][0].data;
    expect(saved.stateHash).not.toBe(result.state);
    expect(vault.decrypt(saved.verifier).length).toBeGreaterThan(40);
    expect(saved.verifier).not.toContain(vault.decrypt(saved.verifier));
  });
  it('recusa estado divergente, expirado e já consumido antes de acessar o Google', async () => {
    const { db, service } = setup();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const state = 'ab'.repeat(32);
    await expect(service.complete(state, 'cd'.repeat(32), 'code')).rejects.toThrow('inválida');
    db.googleOAuthAttempt.findUnique.mockResolvedValue({ expiresAt: new Date(0) });
    await expect(service.complete(state, state, 'code')).rejects.toThrow('expirada');
    db.googleOAuthAttempt.findUnique.mockResolvedValue({
      id: 'attempt',
      expiresAt: new Date(Date.now() + 10000),
    });
    db.googleOAuthAttempt.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.complete(state, state, 'code')).rejects.toThrow('utilizada');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('salva somente tokens criptografados após consentimento completo', async () => {
    const { db, service } = setup();
    const state = 'ab'.repeat(32);
    db.googleOAuthAttempt.findUnique.mockResolvedValue({
      id: 'attempt',
      userId: 'user',
      expiresAt: new Date(Date.now() + 10000),
      verifier: vault.encrypt('qa-verifier'),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'qa-access',
          refresh_token: 'qa-refresh',
          expires_in: 3600,
          scope: googleScopes.join(' '),
        }),
      }),
    );
    await service.complete(state, state, 'qa-code');
    const saved = db.googleChatConnection.upsert.mock.calls[0][0].create;
    expect(saved.accessToken).not.toBe('qa-access');
    expect(vault.decrypt(saved.accessToken)).toBe('qa-access');
    expect(vault.decrypt(saved.refreshToken)).toBe('qa-refresh');
  });
  it('encaminha envio autenticado somente para a API oficial do Google', async () => {
    const { db, service } = setup();
    db.googleChatConnection.findUnique.mockResolvedValue({
      accessToken: vault.encrypt('qa-access'),
      expiresAt: new Date(Date.now() + 3600000),
    });
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ name: 'spaces/qa/messages/1' }) });
    vi.stubGlobal('fetch', fetch);
    await service.request('user', 'spaces/qa/messages', { text: 'Ideia' });
    expect(fetch.mock.calls[0][0]).toBe('https://chat.googleapis.com/v1/spaces/qa/messages');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer qa-access');
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
    expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify({ text: 'Ideia' }));
  });
  it('identifica aplicativo não configurado e mantém o status original sem repetir o envio', async () => {
    const { db, service } = setup();
    db.googleChatConnection.findUnique.mockResolvedValue({
      accessToken: vault.encrypt('qa-access'),
      expiresAt: new Date(Date.now() + 3600000),
    });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: { status: 'NOT_FOUND', message: 'Google Chat app not found. Configure the app.' },
        }),
      });
    vi.stubGlobal('fetch', fetch);
    let failure;
    try {
      await service.request('user', 'spaces/qa/messages', { text: 'Ideia' });
    } catch (error) {
      failure = error;
    }
    expect(failure.getStatus()).toBe(404);
    expect(failure.getResponse().message).toContain(
      'Google Cloud → Google Chat API → Configuração',
    );
    expect(failure.getResponse().googleHttpStatus).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0][0]).not.toContain('qa-access');
  });
  it('oculta credenciais no detalhe e distingue falha do Google de sessão do Hub', async () => {
    const { db, service } = setup();
    db.googleChatConnection.findUnique.mockResolvedValue({
      accessToken: vault.encrypt('qa-access'),
      expiresAt: new Date(Date.now() + 3600000),
    });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({
            error: {
              status: 'UNAUTHENTICATED',
              message: 'qa-access qa-secret Bearer arbitrary-token',
            },
          }),
        }),
    );
    let failure;
    try {
      await service.request('user', 'spaces/qa/messages', { text: 'Ideia' });
    } catch (error) {
      failure = error;
    }
    expect(failure.getStatus()).toBe(502);
    expect(failure.getResponse().googleHttpStatus).toBe(401);
    expect(failure.getResponse().message).not.toMatch(/qa-access|qa-secret|arbitrary-token/);
    expect(warning.mock.calls[0][0]).not.toMatch(/qa-access|qa-secret|arbitrary-token/);
  });
  it('identifica API desativada mesmo quando o Google devolve erro de permissão', async () => {
    const { db, service } = setup();
    db.googleChatConnection.findUnique.mockResolvedValue({
      accessToken: vault.encrypt('qa-access'),
      expiresAt: new Date(Date.now() + 3600000),
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({
            error: { status: 'PERMISSION_DENIED', details: [{ reason: 'SERVICE_DISABLED' }] },
          }),
        }),
    );
    await expect(service.request('user', 'spaces')).rejects.toThrow('Ative a Google Chat API');
  });
});

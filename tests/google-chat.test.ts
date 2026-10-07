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
      vi
        .fn()
        .mockResolvedValue({
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
  });
});

import { afterEach, expect, it, vi } from 'vitest';
import { api, ApiError } from '../apps/web/src/services/api';
afterEach(() => vi.unstubAllGlobals());
it('apresenta indisponibilidade legível quando o proxy retorna HTML', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response('<html>Bad gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
  );
  await expect(api('profile')).rejects.toMatchObject({
    status: 502,
    message: expect.stringContaining('temporariamente indisponível'),
  });
});
it('preserva os erros de validação enviados pelo servidor', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ message: 'Confira o nome.', fields: { name: ['Nome obrigatório'] } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
  );
  await expect(api('profile')).rejects.toMatchObject({
    status: 400,
    fields: { name: ['Nome obrigatório'] },
  });
});
it('encaminha cancelamento e recusa páginas HTML no lugar da API', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response('<html>Login</html>', { headers: { 'Content-Type': 'text/html' } }),
    );
  vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  await expect(api('records/demands', { signal })).rejects.toBeInstanceOf(ApiError);
  expect(fetcher.mock.calls[0][1].signal).toBe(signal);
});

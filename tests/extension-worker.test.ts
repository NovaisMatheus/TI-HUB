import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
const source = readFileSync('extensions/chrome-1doc/background.js', 'utf8');
function worker(href = '/demands/qa-demand') {
  let listener: (message: unknown, sender: unknown, reply: (data: unknown) => void) => unknown;
  const chrome = {
    runtime: {
      id: 'qa-extension',
      getURL: (path: string) => `chrome-extension://qa-extension/${path}`,
      onMessage: {
        addListener: (fn: typeof listener) => {
          listener = fn;
        },
      },
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({ hubUrl: 'http://localhost:5173', token: 'qa-token' }),
        set: vi.fn(),
      },
    },
    tabs: { create: vi.fn() },
  };
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ href, created: true, dispatches: 2 }) });
  runInNewContext(source, { chrome, fetch, AbortSignal, URL, Date });
  return {
    chrome,
    fetch,
    message: (sender: unknown) =>
      new Promise<{ ok: boolean; error?: string }>((resolve) => {
        listener({ type: 'IMPORT_1DOC', payload: { source: '1doc' } }, sender, (data) =>
          resolve(data as { ok: boolean }),
        );
      }),
    ignored: (sender: unknown) => listener({ type: 'IMPORT_1DOC' }, sender, vi.fn()),
  };
}
const sender = { id: 'qa-extension', url: 'chrome-extension://qa-extension/popup.html' };
describe('Service worker da extensão', () => {
  it('conclui importação autenticada e abre a demanda retornada no Hub', async () => {
    const test = worker();
    expect((await test.message(sender)).ok).toBe(true);
    expect(test.fetch.mock.calls[0][0]).toBe('http://localhost:5173/api/imports/1doc');
    expect(test.fetch.mock.calls[0][1].credentials).toBe('omit');
    expect(test.chrome.tabs.create).toHaveBeenCalledWith({
      url: 'http://localhost:5173/demands/qa-demand',
    });
    expect(test.chrome.storage.local.set).toHaveBeenCalled();
  });
  it('ignora mensagens de páginas e outras extensões', () => {
    const test = worker();
    expect(test.ignored({ ...sender, id: 'other-extension' })).toBeUndefined();
    expect(test.ignored({ ...sender, url: 'https://tenant.1doc.com.br/' })).toBeUndefined();
    expect(test.fetch).not.toHaveBeenCalled();
  });
  it('não abre nem armazena redirecionamento para outro domínio', async () => {
    const test = worker('https://foreign.example.invalid/demands/qa');
    expect((await test.message(sender)).ok).toBe(false);
    expect(test.chrome.tabs.create).not.toHaveBeenCalled();
    expect(test.chrome.storage.local.set).not.toHaveBeenCalled();
  });
});

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
    permissions: { contains: vi.fn().mockResolvedValue(true) },
  };
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ href, created: true, dispatches: 2 }) });
  runInNewContext(source, { chrome, fetch, AbortSignal, URL, Date, btoa, Uint8Array });
  return {
    chrome,
    fetch,
    message: (
      sender: unknown,
      payload: unknown = { source: '1doc' },
      downloadLinks: unknown = [],
    ) =>
      new Promise<{ ok: boolean; error?: string }>((resolve) => {
        listener({ type: 'IMPORT_1DOC', payload, downloadLinks }, sender, (data) =>
          resolve(data as { ok: boolean }),
        );
      }),
    ignored: (sender: unknown) => listener({ type: 'IMPORT_1DOC' }, sender, vi.fn()),
  };
}
const sender = { id: 'qa-extension', url: 'chrome-extension://qa-extension/popup.html' };
describe('Service worker da extensão', () => {
  it('usa assinatura temporária para baixar do S3 sem enviá-la nem armazená-la no Hub', async () => {
    const test = worker();
    test.fetch.mockResolvedValueOnce(
      new Response('PDF fixture', { headers: { 'Content-Type': 'application/pdf' } }),
    );
    test.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fileId: 'a'.repeat(64), extractionStatus: 'EXTRAIDO' }),
    });
    const url = 'https://s3.sa-east-1.amazonaws.com/bucket/desc.pdf';
    const payload = {
      source: '1doc',
      attachments: [{ name: 'Descritivo.pdf', url, kind: 'file', details: '' }],
      warnings: [],
    };
    const downloadUrl = `${url}?X-Amz-Security-Token=qa-temporary&X-Amz-Signature=qa-signature`;
    expect((await test.message(sender, payload, [{ url, downloadUrl }])).ok).toBe(true);
    expect(test.fetch.mock.calls[0][0]).toBe(downloadUrl);
    expect(test.fetch.mock.calls[2][1].body).not.toContain('qa-temporary');
    expect(test.fetch.mock.calls[2][1].body).not.toContain('downloadUrl');
    expect(JSON.stringify(test.chrome.storage.local.set.mock.calls)).not.toContain('qa-signature');
  });
  it('copia anexos uma vez, envia binário separado e vincula o arquivo a cada despacho', async () => {
    const test = worker();
    test.fetch.mockResolvedValueOnce(
      new Response('Memoria 16 GB', { headers: { 'Content-Type': 'text/plain' } }),
    );
    test.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fileId: 'a'.repeat(64), extractionStatus: 'EXTRAIDO' }),
    });
    const attachment = {
      name: 'Descritivo.txt',
      url: 'https://tenant.1doc.com.br/desc.txt',
      kind: 'file',
      details: '',
    };
    const payload = {
      source: '1doc',
      attachments: [{ ...attachment }],
      dispatches: [{ attachments: [{ ...attachment }] }],
      warnings: [],
    };
    expect((await test.message(sender, payload)).ok).toBe(true);
    expect(test.fetch).toHaveBeenCalledTimes(3);
    expect(test.fetch.mock.calls[0][1].credentials).toBe('include');
    expect(test.fetch.mock.calls[0][1].headers).toBeUndefined();
    const file = JSON.parse(test.fetch.mock.calls[1][1].body);
    expect(atob(file.dataBase64)).toBe('Memoria 16 GB');
    const imported = JSON.parse(test.fetch.mock.calls[2][1].body);
    expect(imported.attachments[0].fileId).toBe('a'.repeat(64));
    expect(imported.dispatches[0].attachments[0].fileId).toBe('a'.repeat(64));
    expect(imported.attachments[0].dataBase64).toBeUndefined();
  });
  it('salva texto e links com aviso quando o arquivo exige acesso que não foi liberado', async () => {
    const test = worker();
    test.fetch.mockResolvedValueOnce(new Response('', { status: 403 }));
    const payload = {
      source: '1doc',
      attachments: [
        {
          name: 'Descritivo.pdf',
          url: 'https://tenant.1doc.com.br/desc.pdf',
          kind: 'file',
          details: '',
        },
      ],
      warnings: [],
    };
    expect((await test.message(sender, payload)).ok).toBe(true);
    const imported = JSON.parse(test.fetch.mock.calls[1][1].body);
    expect(imported.attachments[0].extractionStatus).toBe('NAO_COPIADO');
    expect(imported.warnings[0]).toMatch(/baixe e anexe no processo/);
  });
  it('aceita o botão flutuante na aba principal do 1Doc e recusa iframes', async () => {
    const test = worker();
    const content = {
      id: 'qa-extension',
      url: 'https://tenant.1doc.com.br/?pg=doc/ver',
      tab: { id: 7 },
      frameId: 0,
    };
    expect((await test.message(content)).ok).toBe(true);
    const iframe = worker();
    expect(iframe.ignored({ ...content, frameId: 1 })).toBeUndefined();
    expect(iframe.fetch).not.toHaveBeenCalled();
  });
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

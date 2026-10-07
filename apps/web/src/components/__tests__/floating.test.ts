// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/react';
afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('ugb-ti-hub-collector')?.remove();
  vi.restoreAllMocks();
});
it('botão flutuante coleta sem salvar, permite aquisição e atualiza apenas no clique de salvamento', async () => {
  document.body.innerHTML = '<div class="page-header-ver"></div>';
  let shadow: ShadowRoot;
  const original = Element.prototype.attachShadow;
  vi.spyOn(Element.prototype, 'attachShadow').mockImplementation(function (this: Element, options) {
    shadow = original.call(this, options);
    return shadow;
  });
  const payload = {
    documentType: 'Memorando',
    number: '20/2026',
    title: 'Compra de equipamentos',
    dispatches: [{}],
    warnings: [],
  };
  const sendMessage = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, data: { exists: true, demand: { kind: 'AQUISICAO' } } })
    .mockResolvedValueOnce({ ok: true, data: { created: false, dispatches: 1 } });
  runInNewContext(readFileSync('extensions/chrome-1doc/floating.js', 'utf8'), {
    document,
    MutationObserver,
    chrome: { runtime: { sendMessage } },
    ugbCollectOneDoc: () => payload,
  });
  const ui = within(shadow! as unknown as HTMLElement);
  fireEvent.click(ui.getByRole('button', { name: 'UGB · TI Hub' }));
  fireEvent.click(ui.getByRole('button', { name: 'Coletar documento' }));
  await waitFor(() => expect(ui.getByRole('button', { name: 'Atualizar demanda' })).toBeTruthy());
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(sendMessage.mock.calls[0][0].type).toBe('LOOKUP_1DOC');
  expect((ui.getByLabelText('Classificação no Hub') as HTMLSelectElement).value).toBe('AQUISICAO');
  fireEvent.click(ui.getByRole('button', { name: 'Atualizar demanda' }));
  await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
  expect(sendMessage.mock.calls[1][0]).toMatchObject({
    type: 'IMPORT_1DOC',
    payload: { kind: 'AQUISICAO', documentType: 'Memorando' },
  });
});

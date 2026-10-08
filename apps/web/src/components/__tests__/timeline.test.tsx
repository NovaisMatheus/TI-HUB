// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AcquisitionTimeline } from '../../modules/acquisitions/AcquisitionTimeline';
afterEach(cleanup);
it('filtra, ordena, expande despacho e mostra o texto original e anexos sem executar HTML', async () => {
  render(
    <MemoryRouter>
      <AcquisitionTimeline
        row={{
          id: 'process',
          sourceDemand: { id: 'demand' },
          documents: [{ id: 'document', fileId: 'file' }],
          timeline: [
            {
              id: 'one',
              source: '1doc',
              title: 'Despacho 1',
              author: 'Pessoa A',
              occurredAt: '2026-10-07T14:15:50Z',
              dateLabel: 'Em 07/10/2026 11:15:50',
              description: 'Segue orçamento.',
              dispatch: {
                id: 'dispatch',
                content: '<script>Conteúdo original</script>',
                metadata: {
                  attachments: [
                    {
                      name: 'Orcamento.pdf',
                      url: 'https://example.invalid/orcamento.pdf',
                      fileId: 'file',
                    },
                  ],
                },
              },
            },
            {
              id: 'hub',
              source: 'hub',
              title: 'Conferência do Hub',
              occurredAt: '2026-10-08T12:00:00Z',
              description: 'Descritivo conferido',
              user: { name: 'Equipe' },
            },
            {
              id: 'undated',
              source: '1doc',
              title: 'Despacho sem data',
              occurredAt: null,
              description: 'Publicação não informada',
            },
          ],
        }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText('07/10/2026, 11:15:50')).toBeTruthy();
  await userEvent.click(screen.getByText('Abrir despacho completo e anexos'));
  expect(screen.getByText('<script>Conteúdo original</script>')).toBeTruthy();
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByRole('link', { name: 'Orcamento.pdf ↗' }).getAttribute('href')).toBe(
    'https://example.invalid/orcamento.pdf',
  );
  await userEvent.selectOptions(screen.getByLabelText('Ordem'), 'desc');
  expect(screen.getAllByRole('heading', { level: 3 })[0].textContent).toBe('Conferência do Hub');
  expect(screen.getAllByRole('heading', { level: 3 }).at(-1)?.textContent).toBe(
    'Despacho sem data',
  );
  expect(
    screen.getByRole('link', { name: 'Baixar cópia de Orcamento.pdf' }).getAttribute('href'),
  ).toBe('/api/documents/document/file');
  await userEvent.selectOptions(screen.getByLabelText('Origem'), '1doc');
  expect(screen.queryByText('Conferência do Hub')).toBeNull();
  await userEvent.type(screen.getByLabelText('Pesquisar na timeline'), 'inexistente');
  expect(screen.getByRole('status').textContent).toContain('Nenhum evento');
});

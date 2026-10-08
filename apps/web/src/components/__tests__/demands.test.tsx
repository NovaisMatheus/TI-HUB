// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DemandDetail } from '../../modules/demands/DemandDetail';
import { api, send } from '../../services/api';
vi.mock('../../services/api', () => ({ api: vi.fn(), send: vi.fn() }));
afterEach(cleanup);
it('abre o atendimento vinculado à demanda de suporte', async () => {
  vi.mocked(api).mockResolvedValue({
    id: 'support-demand',
    title: 'Computador não liga',
    documentType: 'Chamado técnico',
    number: '44/2026',
    kind: 'SUPORTE',
    status: 'ABERTA',
    metadata: {},
    dispatches: [],
    supportRecord: { id: 'support-case' },
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <DemandDetail
          id="support-demand"
          user={{
            id: 'user',
            name: 'Técnico',
            email: 'qa@example.invalid',
            permissions: ['demands.read', 'maintenance.read'],
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(
    (
      await screen.findByRole('link', { name: 'Abrir suporte, diagnóstico, despachos e anexos' })
    ).getAttribute('href'),
  ).toBe('/maintenance/support-case');
});
it('exibe cada despacho e salva a gestão interna sem alterar a classificação de origem', async () => {
  vi.mocked(api).mockResolvedValue({
    id: 'qa',
    title: 'Acesso ao sistema',
    documentType: 'Circular',
    number: '20/2026',
    sourceStatus: 'Recebido',
    status: 'ABERTA',
    notes: '',
    description: '<script>conteúdo textual</script>',
    metadata: { fields: [{ label: 'Tipo de atendimento', value: 'Liberação de módulo' }] },
    dispatches: [
      {
        id: 'one',
        title: 'Despacho 1',
        author: 'Pessoa A',
        content: 'Primeira resposta',
        metadata: {},
      },
      { id: 'two', title: 'Despacho 2', author: 'Pessoa B', content: 'Autorizado', metadata: {} },
    ],
  });
  vi.mocked(send).mockResolvedValue({});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DemandDetail
          id="qa"
          user={{
            id: 'user',
            name: 'QA',
            email: 'qa@example.invalid',
            permissions: ['demands.read', 'demands.write'],
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText('Despacho 1');
  expect(screen.getByText('Despacho 2')).toBeTruthy();
  expect(screen.getByText('Liberação de módulo')).toBeTruthy();
  expect(screen.getByText(/Circular 20\/2026/)).toBeTruthy();
  expect(screen.getByText('<script>conteúdo textual</script>')).toBeTruthy();
  expect(document.querySelector('script')).toBeNull();
  await userEvent.selectOptions(screen.getByLabelText('Situação no Hub'), 'EM_ANDAMENTO');
  await userEvent.type(screen.getByLabelText('Observações internas'), 'Aguardando retorno');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith(
      'records/demands/qa',
      { status: 'EM_ANDAMENTO', notes: 'Aguardando retorno', kind: 'SUPORTE' },
      'PATCH',
    ),
  );
});

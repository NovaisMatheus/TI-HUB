// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AcquisitionWorkspace } from '../../modules/acquisitions/AcquisitionWorkspace';
import { send } from '../../services/api';
import type { Entity } from '../../types';
vi.mock('../../services/api', () => ({ api: vi.fn(), send: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const user = {
  id: 'user',
  name: 'QA',
  email: 'qa@example.invalid',
  permissions: [
    'acquisition.read',
    'acquisition.write',
    'documents.read',
    'documents.write',
    'analysis.read',
    'analysis.write',
  ],
};
const row: Entity = {
  id: 'process',
  request: {
    id: 'request',
    number: 'Memorando 1/2026',
    description: 'Pedido de computador',
    purchaseRequestItem_request: [
      {
        id: 'item',
        quantity: null,
        specificationVersion: {
          id: 'version',
          version: 1,
          content: 'Texto da requisicao',
          specification: { id: 'spec' },
          specificationRequirement_version: [],
        },
      },
    ],
  },
  documents: [
    {
      id: 'document',
      title: 'Descritivo.pdf',
      category: 'DESCRITIVO',
      url: 'https://example.invalid/desc.pdf',
      fileId: 'file',
      file: {
        id: 'file',
        extractedText: '<script>Memoria minima 16 GB</script>',
        extractionStatus: 'EXTRAIDO',
        size: 100,
      },
    },
  ],
  proposals: [],
  analyses: [],
  sourceDemand: {
    id: 'demand',
    number: '1/2026',
    documentType: 'Memorando',
    title: 'Computador',
    description: 'Original da requisicao',
    metadata: {},
    dispatches: [
      {
        id: 'dispatch',
        title: 'Despacho 1',
        content: 'Segue orcamento',
        metadata: {
          attachments: [
            { id: 'attachment', name: 'Orcamento.xlsx', url: 'https://example.invalid/orc.xlsx' },
          ],
        },
      },
    ],
  },
};
function mount(sourceOnly = false) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <AcquisitionWorkspace row={row} user={user} sourceOnly={sourceOnly} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it('carrega texto do anexo para conferência e envia quantidade e requisitos sem inventar valores', async () => {
  vi.mocked(send).mockResolvedValue({});
  mount();
  expect((screen.getByLabelText('Quantidade requisitada') as HTMLInputElement).value).toBe('');
  expect(screen.getByRole('link', { name: 'Baixar cópia do arquivo' }).getAttribute('href')).toBe(
    '/api/documents/document/file',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Usar no descritivo para conferência' }),
  );
  expect(document.querySelector('script')).toBeNull();
  await userEvent.type(screen.getByLabelText('Quantidade requisitada'), '2');
  await userEvent.type(screen.getByLabelText('Grupo'), 'Memoria');
  await userEvent.type(screen.getByLabelText('Característica'), 'Capacidade');
  await userEvent.type(screen.getByLabelText('Exigência'), '16');
  await userEvent.type(screen.getByLabelText('Unidade'), 'GB');
  await userEvent.click(screen.getByRole('button', { name: 'Conferir descritivo e quantidade' }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith('acquisitions/process/specification', {
      content: 'Anexo: Descritivo.pdf\n<script>Memoria minima 16 GB</script>',
      quantity: 2,
      requirements: 'Memoria | Capacidade | >= | 16 | GB | texto',
    }),
  );
});
it('mostra a requisição e cada despacho com os anexos dentro do processo', async () => {
  mount(true);
  expect(screen.getByText('Original da requisicao')).toBeTruthy();
  expect(screen.getByText(/Despacho 1/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Orcamento.xlsx ↗' }).getAttribute('href')).toBe(
    'https://example.invalid/orc.xlsx',
  );
});

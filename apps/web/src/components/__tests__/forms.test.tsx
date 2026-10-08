// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EntityForm } from '../EntityForm';
import { api, send } from '../../services/api';
vi.mock('../../services/api', () => ({ api: vi.fn(), send: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('edita diagnóstico sem equipamento e aceita e-mail opcional em branco', async () => {
  vi.mocked(api).mockResolvedValue({ items: [], total: 0 });
  vi.mocked(send).mockResolvedValue({ id: 'support' });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EntityForm
        open
        resource="maintenance"
        item={{ id: 'support', equipmentId: null, diagnosis: '' }}
        config={{
          label: 'Suporte',
          singular: 'Atendimento',
          title: 'diagnosis',
          permission: 'maintenance',
          columns: [],
          fields: [
            { name: 'equipmentId', label: 'Equipamento', ref: 'equipment', optional: true },
            { name: 'diagnosis', label: 'Diagnóstico' },
            { name: 'email', label: 'Contato', type: 'email', optional: true },
          ],
        }}
        onClose={() => {}}
      />
    </QueryClientProvider>,
  );
  await userEvent.type(screen.getByLabelText(/^Diagnóstico/), 'Fonte com defeito');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar registro' }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith(
      'records/maintenance/support',
      { diagnosis: 'Fonte com defeito' },
      'PATCH',
    ),
  );
});
it('mantém vínculo fora da primeira página e pesquisa equipamento pelo servidor', async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    path === 'records/equipment/selected'
      ? { id: 'selected', hostname: 'PC-ATUAL' }
      : path.includes('q=PC-ALVO')
        ? { items: [{ id: 'target', hostname: 'PC-ALVO' }], total: 1 }
        : { items: [], total: 150 },
  );
  vi.mocked(send).mockResolvedValue({ id: 'support' });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EntityForm
        open
        resource="maintenance"
        item={{ id: 'support', equipmentId: 'selected' }}
        config={{
          label: 'Suporte',
          singular: 'Atendimento',
          title: 'problem',
          permission: 'maintenance',
          columns: [],
          fields: [{ name: 'equipmentId', label: 'Equipamento', ref: 'equipment', optional: true }],
        }}
        onClose={() => {}}
      />
    </QueryClientProvider>,
  );
  await screen.findByRole('option', { name: 'PC-ATUAL' });
  expect((screen.getByLabelText('Equipamento') as HTMLSelectElement).value).toBe('selected');
  await userEvent.type(screen.getByLabelText('Buscar equipamento'), 'PC-ALVO');
  await screen.findByRole('option', { name: 'PC-ALVO' });
  await userEvent.selectOptions(screen.getByLabelText('Equipamento'), 'target');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar registro' }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith(
      'records/maintenance/support',
      { equipmentId: 'target' },
      'PATCH',
    ),
  );
});

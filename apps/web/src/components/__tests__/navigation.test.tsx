// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResourceList } from '../ResourceList';
import { api } from '../../services/api';
vi.mock('../../services/api', () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const catalog = {
  demands: {
    label: 'Demandas',
    singular: 'Demanda',
    permission: 'demands',
    title: 'title',
    columns: ['title', 'status'],
    fields: [{ name: 'status', label: 'Status', options: ['ABERTA', 'CONCLUIDA'] }],
  },
};
function Detail() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Voltar à lista</button>;
}
it('mantém busca e classificação ao abrir um registro e voltar à lista', async () => {
  vi.mocked(api).mockResolvedValue({
    items: [{ id: 'one', title: 'Computador', status: 'ABERTA' }],
    total: 1,
    page: 1,
    pageSize: 15,
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/demands?kind=SUPORTE']}>
        <Routes>
          <Route
            path="/demands"
            element={
              <ResourceList
                name="demands"
                catalog={catalog}
                user={{
                  id: 'qa',
                  name: 'QA',
                  email: 'qa@example.invalid',
                  permissions: ['demands.read'],
                }}
              />
            }
          />
          <Route path="/demands/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole('link', { name: 'Computador' });
  const search = screen.getByPlaceholderText('Buscar demandas…');
  await userEvent.type(search, 'computador');
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      expect.stringContaining('q=computador'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ),
  );
  await userEvent.click(screen.getByRole('link', { name: 'Computador' }));
  await userEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
  expect(((await screen.findByPlaceholderText('Buscar demandas…')) as HTMLInputElement).value).toBe(
    'computador',
  );
  expect((screen.getByLabelText('Filtrar classificação') as HTMLSelectElement).value).toBe(
    'SUPORTE',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  expect((screen.getByLabelText('Filtrar classificação') as HTMLSelectElement).value).toBe('');
});

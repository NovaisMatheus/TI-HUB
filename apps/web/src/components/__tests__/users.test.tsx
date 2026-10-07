// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Users, PasswordSettings } from '../../modules/administration/Users';
import { api, send } from '../../services/api';
vi.mock('../../services/api', () => ({ api: vi.fn(), send: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function mount(content: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {content}
    </QueryClientProvider>,
  );
}
it('edita uma conta sem redefinir sua senha quando o campo fica vazio', async () => {
  vi.mocked(api).mockResolvedValue([
    {
      id: 'qa',
      name: 'Pessoa QA',
      username: 'pessoa.qa',
      email: 'qa@example.invalid',
      roles: ['TECNICO'],
      active: true,
    },
  ]);
  vi.mocked(send).mockResolvedValue({});
  mount(<Users />);
  await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
  await userEvent.selectOptions(screen.getByLabelText('Perfil'), 'CONSULTA');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar usuário' }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith(
      'users/qa',
      expect.objectContaining({ role: 'CONSULTA', password: undefined }),
      'PATCH',
    ),
  );
  expect(await screen.findByText('Usuário salvo.')).toBeTruthy();
});
it('exige que a confirmação coincida antes de trocar a senha', async () => {
  mount(<PasswordSettings />);
  await userEvent.type(screen.getByLabelText('Senha atual'), 'Senha atual fictícia');
  await userEvent.type(screen.getByLabelText('Nova senha'), 'Senha nova fictícia');
  await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'Outra senha fictícia');
  await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
  expect(await screen.findByText('As novas senhas não coincidem.')).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
});

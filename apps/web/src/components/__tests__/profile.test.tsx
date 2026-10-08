// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileDetails } from '../../modules/administration/ProfileDetails';
import { send } from '../../services/api';
vi.mock('../../services/api', () => ({ send: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const account = {
  id: 'qa',
  name: 'Pessoa Alves Teste',
  username: 'pessoa.teste',
  email: 'qa@example.invalid',
  roles: ['TECNICO'],
  jobTitle: '',
  phone: '',
  departmentName: '',
  bio: '',
};
it('salva informações pessoais sem enviar credenciais ou permissões', async () => {
  vi.mocked(send).mockResolvedValue({ success: true });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileDetails account={account} />
    </QueryClientProvider>,
  );
  expect(screen.getByText('PT')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Editar meu perfil' }));
  await userEvent.type(screen.getByLabelText('Cargo ou função'), 'Analista de TI');
  await userEvent.type(screen.getByLabelText('Setor'), 'Tecnologia');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith(
      'profile',
      {
        name: account.name,
        jobTitle: 'Analista de TI',
        departmentName: 'Tecnologia',
        phone: '',
        bio: '',
      },
      'PATCH',
    ),
  );
  expect(await screen.findByText('Perfil atualizado.')).toBeTruthy();
});
it('preserva o formulário preenchido quando o salvamento falha', async () => {
  vi.mocked(send).mockRejectedValue(new Error('Sem conexão'));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileDetails account={account} />
    </QueryClientProvider>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Editar meu perfil' }));
  await userEvent.type(screen.getByLabelText('Sobre mim'), 'Suporte técnico');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  expect(await screen.findByText('Sem conexão')).toBeTruthy();
  expect((screen.getByLabelText('Sobre mim') as HTMLTextAreaElement).value).toBe('Suporte técnico');
});

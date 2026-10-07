// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatPanel } from '../../modules/chat/ChatPanel';
import { api, send } from '../../services/api';
vi.mock('../../services/api', () => ({ api: vi.fn(), send: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const user = {
  id: 'qa',
  name: 'QA',
  email: 'qa@example.invalid',
  permissions: ['chat.read', 'chat.write'],
};
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ChatPanel user={user} open setOpen={vi.fn()} />
    </QueryClientProvider>,
  );
}
it('envia mensagem da equipe e mostra configuração pendente sem simular conexão Google', async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    path.includes('status')
      ? ({ configured: false, connected: false } as never)
      : ({
          items: [
            {
              id: 'message',
              text: 'Ideia da equipe',
              user: { name: 'Pessoa A' },
              createdAt: '2026-10-07T12:00:00Z',
            },
          ],
        } as never),
  );
  vi.mocked(send).mockResolvedValue({});
  mount();
  await screen.findByText('Ideia da equipe');
  await userEvent.type(
    screen.getByLabelText('Mensagem para troca de ideias'),
    'Vamos revisar o memorando',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith(
      'chat/messages',
      expect.objectContaining({ text: 'Vamos revisar o memorando', requestId: expect.any(String) }),
    ),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Google Chat' }));
  expect(screen.getByText(/aguarda configuração/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Conectar Google Chat' })).toBeNull();
});
it('preserva o rascunho e reutiliza a chave de envio quando a tentativa falha', async () => {
  vi.mocked(api).mockResolvedValue({ items: [] });
  vi.mocked(send).mockRejectedValue(new Error('Falha de rede'));
  mount();
  await userEvent.type(screen.getByLabelText('Mensagem para troca de ideias'), 'Minha ideia');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  await screen.findByText('Falha de rede');
  expect(
    (screen.getByLabelText('Mensagem para troca de ideias') as HTMLTextAreaElement).value,
  ).toBe('Minha ideia');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(vi.mocked(send).mock.calls[0][1]).toEqual(vi.mocked(send).mock.calls[1][1]);
});

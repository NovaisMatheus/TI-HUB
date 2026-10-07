// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeControl } from '../ThemeControl';
import { Workspace } from '../../layouts/Workspace';
import type { SessionUser } from '@hub/types';
import { api, send } from '../../services/api';

vi.mock('../../services/api', () => ({ api: vi.fn(), send: vi.fn() }));
const user: SessionUser = {
  id: 'test-user',
  name: 'Usuário Teste',
  email: 'qa@example.invalid',
  permissions: [],
  theme: 'light',
};
let dark = false;
let mediaChanged: (() => void) | undefined;
beforeEach(() => {
  localStorage.clear();
  dark = false;
  vi.mocked(send).mockReset().mockResolvedValue({});
  vi.mocked(api).mockReset().mockResolvedValue([]);
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return dark;
    },
    addEventListener: (_name: string, listener: () => void) => {
      mediaChanged = listener;
    },
    removeEventListener: () => {
      mediaChanged = undefined;
    },
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['session'], user);
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, client };
}
function Shell() {
  const [open, setOpen] = useState(false);
  return <Workspace user={user} onLogout={() => {}} searchOpen={open} setSearchOpen={setOpen} />;
}
describe('Pesquisa e tema interativos', () => {
  it('isola a preferência por usuário e ignora valores locais inválidos', () => {
    localStorage.setItem('hub-theme:another-user', 'dark');
    localStorage.setItem(`hub-theme:${user.id}`, 'invalid');
    mount(<ThemeControl user={user} />);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Tema Claro' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
  it('aplica os três temas, acompanha o sistema e restaura a preferência local', async () => {
    const { unmount, client } = mount(<ThemeControl user={user} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tema Escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await waitFor(() => expect(client.getQueryData<SessionUser>(['session'])?.theme).toBe('dark'));
    expect(localStorage.getItem(`hub-theme:${user.id}`)).toBe('dark');
    unmount();
    mount(<ThemeControl user={user} />);
    expect(screen.getByRole('button', { name: 'Tema Escuro' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tema Sistema' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    act(() => {
      dark = true;
      mediaChanged?.();
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: 'Tema Claro' }));
    act(() => {
      dark = true;
      mediaChanged?.();
    });
    expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('serializa mudanças rápidas e mantém a escolha local se o salvamento falhar', async () => {
    let finish: (() => void) | undefined;
    vi.mocked(send)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () => resolve({});
          }),
      )
      .mockRejectedValueOnce(new Error('offline'));
    mount(<ThemeControl user={user} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tema Escuro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tema Claro' }));
    expect(send).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.theme).toBe('light');
    await act(async () => {
      finish?.();
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível salvar');
    expect(localStorage.getItem(`hub-theme:${user.id}`)).toBe('light');
  });
  it('oferece campo visível, conserva o texto, mostra resultados e fecha com Escape', async () => {
    vi.mocked(api).mockResolvedValue([
      {
        id: 'equipment',
        title: 'PC-FINANCEIRO-03',
        excerpt: 'IP 192.168.10.50',
        href: '/equipment/test',
        kind: 'official',
      },
    ]);
    mount(<Shell />);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Pesquisa global' }),
      '192.168.10.50{Enter}',
    );
    const input = screen.getByRole('textbox', { name: 'Pesquisar registros' });
    expect((input as HTMLInputElement).value).toBe('192.168.10.50');
    expect(document.activeElement).toBe(input);
    expect(screen.queryByText('Nenhum registro encontrado.')).toBeNull();
    await screen.findByRole('button', { name: /PC-FINANCEIRO-03/ });
    expect(api).toHaveBeenCalledWith('search?q=192.168.10.50');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeTruthy();
    await userEvent.click(await screen.findByRole('button', { name: /PC-FINANCEIRO-03/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('distingue consulta curta, nenhum resultado e erro de pesquisa', async () => {
    mount(<Shell />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('textbox', { name: 'Pesquisar registros' });
    await userEvent.type(input, 'ab');
    expect(screen.getByText(/Digite pelo menos 3/)).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
    await userEvent.type(input, 'c');
    await screen.findByText('Nenhum registro encontrado.');
    vi.mocked(api).mockRejectedValue(new Error('offline'));
    await userEvent.type(input, 'd');
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toBe('Não foi possível pesquisar.');
  });
});

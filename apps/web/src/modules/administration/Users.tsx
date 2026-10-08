import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@hub/ui';
import { api, send } from '../../services/api';
type Account = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  active: boolean;
  roles: string[];
};
const blank = { name: '', email: '', username: '', role: 'TECNICO', active: true, password: '' };
export function Users() {
  const client = useQueryClient();
  const users = useQuery({ queryKey: ['users'], queryFn: () => api<Account[]>('users') });
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [opened, setOpened] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  return (
    <section className="detail-section">
      <div className="section-heading">
        <h2>Usuários e acessos</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(blank);
            setMessage('');
            setOpened(true);
          }}
        >
          Novo usuário
        </Button>
      </div>
      <p>
        Administrador gerencia acessos. Técnico registra e altera dados. Consulta permite leitura.
      </p>
      <label className="account-search">
        Buscar usuário
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome, e-mail ou usuário…"
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />{' '}
        Mostrar usuários inativos
      </label>
      {opened && (
        <form
          className="account-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage('');
            try {
              await send(
                editing ? `users/${editing}` : 'users',
                { ...form, ...(editing && !form.password ? { password: undefined } : {}) },
                editing ? 'PATCH' : 'POST',
              );
              await client.invalidateQueries({ queryKey: ['users'] });
              await client.invalidateQueries({ queryKey: ['session'] });
              setOpened(false);
              setForm(blank);
              setMessage('Usuário salvo.');
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Falha ao salvar.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nome completo
            <input
              required
              minLength={2}
              maxLength={150}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Usuário
            <input
              required
              minLength={3}
              maxLength={80}
              autoComplete="off"
              pattern="[a-z0-9]+([._\-][a-z0-9]+)*"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Perfil
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="TECNICO">Técnico</option>
              <option value="CONSULTA">Consulta</option>
            </select>
          </label>
          <label>
            {editing ? 'Nova senha (opcional)' : 'Senha inicial'}
            <input
              type="password"
              autoComplete="new-password"
              required={!editing}
              minLength={12}
              maxLength={72}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <small>De 12 a 72 caracteres. A troca de senha encerra as sessões anteriores.</small>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{' '}
            Conta ativa
          </label>
          <div>
            <Button disabled={busy}>{busy ? 'Salvando…' : 'Salvar usuário'}</Button>{' '}
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setOpened(false);
                setForm(blank);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
      <p role="status">{message}</p>
      {users.isError && <p role="alert">{users.error.message}</p>}
      {users.isLoading ? (
        <p>Carregando usuários…</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nome / e-mail</th>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.data
                ?.filter(
                  (user) =>
                    (showInactive || user.active) &&
                    `${user.name} ${user.email} ${user.username ?? ''}`
                      .toLocaleLowerCase('pt-BR')
                      .includes(search.toLocaleLowerCase('pt-BR')),
                )
                .map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.name}
                      <small className="muted">{user.email}</small>
                    </td>
                    <td>{user.username ?? 'Usa e-mail'}</td>
                    <td>{user.roles.join(', ')}</td>
                    <td>{user.active ? 'Ativo' : 'Inativo'}</td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditing(user.id);
                          setForm({
                            name: user.name,
                            email: user.email,
                            username: user.username ?? '',
                            role: user.roles[0] ?? 'CONSULTA',
                            active: user.active,
                            password: '',
                          });
                          setMessage('');
                          setOpened(true);
                        }}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export function PasswordSettings() {
  const client = useQueryClient();
  const [currentPassword, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <section className="detail-section">
      <h2>Minha senha</h2>
      <form
        className="account-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setMessage('As novas senhas não coincidem.');
            return;
          }
          setBusy(true);
          setMessage('');
          try {
            await send('auth/password', { currentPassword, password });
            setCurrent('');
            setPassword('');
            setConfirm('');
            client.clear();
            window.location.assign('/');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Falha ao trocar senha.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Senha atual
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          Nova senha
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Confirmar nova senha
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <p>Ao trocar a senha, entre novamente e gere uma nova credencial para a extensão 1Doc.</p>
        <Button disabled={busy}>{busy ? 'Salvando…' : 'Trocar senha'}</Button>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}

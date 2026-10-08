import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@hub/ui';
import { send } from '../../services/api';
import { display, type Entity } from '../../types';

export function ProfileDetails({ account }: { account: Entity }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const initials = String(account.name).trim().split(/\s+/).filter(Boolean);
  return (
    <section className="detail-section">
      <div className="profile-identity">
        <span className="profile-avatar" aria-hidden="true">
          {[initials[0]?.[0], initials.length > 1 ? initials.at(-1)?.[0] : '']
            .join('')
            .toUpperCase()}
        </span>
        <div>
          <h2>{display(account.name)}</h2>
          <p>
            {display(account.jobTitle)} · {display(account.departmentName)}
          </p>
          <small>
            {display(account.email)} · @{display(account.username)}
          </small>
        </div>
      </div>
      <div className="profile-tags">
        {(Array.isArray(account.roles) ? account.roles : []).map((role) => (
          <span key={String(role)}>{String(role).replaceAll('_', ' ')}</span>
        ))}
        <span>Membro desde {display(account.createdAt)}</span>
      </div>
      {!editing ? (
        <>
          <p className="source-text">
            {String(
              account.bio ||
                'Adicione sua função e uma breve apresentação para completar seu perfil.',
            )}
          </p>
          {!!account.phone && <p>Telefone / ramal: {String(account.phone)}</p>}
          <Button
            variant="outline"
            onClick={() => {
              setEditing(true);
              setMessage('');
            }}
          >
            Editar meu perfil
          </Button>
        </>
      ) : (
        <form
          className="account-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setMessage('');
            const form = new FormData(event.currentTarget);
            try {
              await send(
                'profile',
                Object.fromEntries(
                  ['name', 'jobTitle', 'departmentName', 'phone', 'bio'].map((key) => [
                    key,
                    form.get(key),
                  ]),
                ),
                'PATCH',
              );
              await Promise.all([
                client.invalidateQueries({ queryKey: ['profile'] }),
                client.invalidateQueries({ queryKey: ['session'] }),
              ]);
              setEditing(false);
              setMessage('Perfil atualizado.');
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Falha ao salvar perfil.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nome completo
            <input
              name="name"
              required
              minLength={2}
              maxLength={150}
              autoComplete="name"
              defaultValue={String(account.name ?? '')}
            />
          </label>
          <label>
            Cargo ou função
            <input
              name="jobTitle"
              maxLength={120}
              autoComplete="organization-title"
              defaultValue={String(account.jobTitle ?? '')}
            />
          </label>
          <label>
            Setor
            <input
              name="departmentName"
              maxLength={150}
              defaultValue={String(account.departmentName ?? '')}
            />
          </label>
          <label>
            Telefone / ramal
            <input
              name="phone"
              maxLength={40}
              autoComplete="tel"
              defaultValue={String(account.phone ?? '')}
            />
          </label>
          <label>
            Sobre mim
            <textarea
              name="bio"
              rows={4}
              maxLength={1000}
              defaultValue={String(account.bio ?? '')}
            />
          </label>
          <small>Usuário, e-mail e permissões são gerenciados pela administração.</small>
          <div>
            <Button disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</Button>{' '}
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      <p role="status">{message}</p>
    </section>
  );
}

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Badge } from '@hub/ui';
import { api, send } from '../../services/api';
import { display, object, type Entity } from '../../types';
import type { Page, SessionUser } from '@hub/types';
import { ExtensionSettings } from '../demands/ExtensionSettings';
import { PageHeader, State } from '../../components/PageHeader';
import { Users, PasswordSettings } from './Users';
export function Administration({ user }: { user: SessionUser }) {
  const [page, setPage] = useState(1),
    [q, setQ] = useState('');
  const result = useQuery({
    queryKey: ['audit', page, q],
    queryFn: () => api<Page<Entity>>(`audit?page=${page}&q=${encodeURIComponent(q)}`),
  });
  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api<{ providers: Entity[] }>('integrations'),
  });
  return (
    <>
      <PageHeader
        eyebrow="GOVERNANÇA"
        title="Administração"
        description="Rastreabilidade de alterações e estado das integrações."
      />
      {user.permissions.includes('users.write') && <Users />}
      <div className="integration-grid">
        {integrations.data?.providers.map((p) => (
          <article className="detail-section" key={String(p.name)}>
            <Badge value="MOCK" />
            <h3>{display(p.name)}</h3>
            <p>{display(p.description)}</p>
          </article>
        ))}
      </div>
      <div className="section-heading">
        <h2>Auditoria administrativa</h2>
        <input
          aria-label="Buscar auditoria"
          placeholder="Buscar entidade ou ação…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <p className="muted">Este log é separado do histórico técnico e da timeline dos processos.</p>
      {result.isLoading ? (
        <State message="Carregando auditoria…" />
      ) : result.isError ? (
        <State error message={result.error.message} />
      ) : (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>Alterações</th>
                </tr>
              </thead>
              <tbody>
                {result.data?.items.map((row) => (
                  <tr key={row.id}>
                    <td>{display(row.createdAt)}</td>
                    <td>{display(row.user)}</td>
                    <td>{display(row.action)}</td>
                    <td>
                      {display(row.entityType)}
                      <small className="muted">{row.entityId as string}</small>
                    </td>
                    <td>
                      <details>
                        <summary>Antes / depois</summary>
                        <pre>
                          {JSON.stringify({ antes: row.before, depois: row.after }, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="table-footer">
            <span>{result.data?.total} eventos</span>
            <div>
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button
                variant="ghost"
                disabled={page * 20 >= (result.data?.total ?? 0)}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
}
export function Profile({ user }: { user: SessionUser }) {
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api<Entity>('profile') });
  return (
    <>
      <PageHeader
        title="Meu perfil"
        description="Preferências pessoais e configuração do assistente."
      />
      <section className="detail-section">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </section>
      {user.permissions.includes('demands.write') && <ExtensionSettings />}
      <section className="detail-section">
        <h2>Acesso HTTPS na rede</h2>
        <p>
          Nesta instalação, baixe e extraia o ZIP do configurador. Execute o script extraído em um
          PowerShell aberto como administrador em cada PC. Ele instala o certificado de confiança do
          Hub e o endereço interno. Reinicie o navegador depois da instalação.
        </p>
        <a
          className="button button-outline"
          href="/downloads/configurador-https-ti-hub.zip"
          download="configurador-https-ti-hub.zip"
        >
          Baixar configurador HTTPS (ZIP)
        </a>
        <p>
          Endereço HTTPS:{' '}
          <a href="https://ti-hub.192-168-10-9.sslip.io">https://ti-hub.192-168-10-9.sslip.io</a>
        </p>
      </section>
      <PasswordSettings />
      <section className="detail-section">
        <h2>Inteligência artificial</h2>
        <p>Provider atual: mock · modelo de recuperação de registros.</p>
        <p>Providers externos e credenciais ainda não são configuráveis nesta versão.</p>
        {profile.data && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!object(profile.data.ai).enabled}
              onChange={async (e) => {
                try {
                  await send('profile', { aiEnabled: e.target.checked }, 'PATCH');
                  await client.invalidateQueries({ queryKey: ['profile'] });
                  setMessage('Preferência salva.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Falha.');
                }
              }}
            />{' '}
            Habilitar assistente
          </label>
        )}
        {profile.isError && <p className="error">Falha ao carregar preferências.</p>}
        <p role="status">{message}</p>
      </section>
    </>
  );
}
export function Tools() {
  return (
    <>
      <PageHeader
        eyebrow="UTILITÁRIOS"
        title="Ferramentas"
        description="Ações manuais e consultas para a rotina técnica."
      />
      <div className="integration-grid">
        {['RDP / VNC / SMB', 'Teste de conexão', 'Scripts de diagnóstico'].map((name, i) => (
          <section key={name} className="detail-section">
            <Badge value={i === 2 ? 'CONSULTA' : 'NAO_CONFIGURADO'} />
            <h2>{name}</h2>
            <p>
              {i === 0
                ? 'O launcher local usa um adapter mock. Abra um equipamento para solicitar uma simulação segura.'
                : i === 1
                  ? 'Teste real desativado. Não há monitoramento ou varredura automática.'
                  : 'Biblioteca versionada para consulta. Nenhum script é executado no Hub.'}
            </p>
            <a className="text-link" href={i === 2 ? '/scripts' : '/equipment'}>
              Abrir {i === 2 ? 'biblioteca' : 'equipamentos'} →
            </a>
          </section>
        ))}
      </div>
    </>
  );
}

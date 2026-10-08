import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Badge } from '@hub/ui';
import type { SessionUser } from '@hub/types';
import { api, send } from '../../services/api';
import { display, object, entities, type Entity } from '../../types';
import { PageHeader, State } from '../../components/PageHeader';

function External({ url, label }: { url: unknown; label: string }) {
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {label} ↗
    </a>
  );
}
export function CapturedData({ data }: { data: Entity }) {
  return (
    <>
      {!!entities(data.fields).length && (
        <dl>
          {entities(data.fields).map((field, i) => (
            <div key={i}>
              <dt>{display(field.label)}</dt>
              <dd>{display(field.value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {!!entities(data.participants).length && (
        <div>
          <h4>Participantes</h4>
          {entities(data.participants).map((p, i) => (
            <p key={i}>
              {display(p.name)} · {display(p.department)} · {display(p.role)}
            </p>
          ))}
        </div>
      )}
      {!!entities(data.attachments).length && (
        <div>
          <h4>Anexos e links</h4>
          <ul>
            {entities(data.attachments).map((a, i) => (
              <li key={i}>
                <External url={a.url} label={display(a.name)} /> <small>{display(a.details)}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
export function DemandDetail({ id, user }: { id: string; user: SessionUser }) {
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const result = useQuery({
    queryKey: ['record', 'demands', id],
    queryFn: () => api<Entity>(`records/demands/${id}`),
  });
  if (result.isLoading) return <State message="Carregando demanda…" />;
  if (result.isError) return <State error message={result.error.message} />;
  const row = result.data!;
  const metadata = object(row.metadata);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await send(
        `records/demands/${id}`,
        { status: form.get('status'), notes: form.get('notes'), kind: form.get('kind') },
        'PATCH',
      );
      await client.invalidateQueries({ queryKey: ['record', 'demands', id] });
      setMessage('Demanda atualizada.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/demands">
        ← Demandas
      </Link>
      <PageHeader
        eyebrow={`1DOC · ${display(row.documentType)} ${display(row.number)}`}
        title={display(row.title)}
        description={`${display(row.requester)} · ${display(row.sourceStatus)}`}
        actions={<Badge value={String(row.status)} />}
      />
      {row.kind === 'AQUISICAO' &&
        user.permissions.includes('acquisition.read') &&
        object(row.acquisitionProcess).id && (
          <section className="detail-section">
            <h2>Processo de aquisição</h2>
            <Link
              className="button button-primary"
              to={`/acquisitions/${object(row.acquisitionProcess).id}`}
            >
              Abrir processo, descritivo, orçamentos e análises
            </Link>
          </section>
        )}
      {row.kind === 'SUPORTE' &&
        user.permissions.includes('maintenance.read') &&
        object(row.supportRecord).id && (
          <section className="detail-section">
            <h2>Atendimento de suporte</h2>
            <Link
              className="button button-primary"
              to={`/maintenance/${object(row.supportRecord).id}`}
            >
              Abrir suporte, diagnóstico, despachos e anexos
            </Link>
          </section>
        )}
      <section className="detail-section">
        <h2>Documento original</h2>
        <p>
          <External url={row.sourceUrl} label="Abrir no 1Doc" /> · Coletado em{' '}
          {display(row.capturedAt)}
        </p>
        <p>
          Abertura: {display(metadata.openedAt)} · Código externo: {display(metadata.externalCode)}
        </p>
        <p className="captured-text">{display(row.description)}</p>
        <CapturedData data={metadata} />
        <details>
          <summary>Demais informações coletadas</summary>
          <pre className="captured-text">{JSON.stringify(metadata, null, 2)}</pre>
        </details>
      </section>
      <section className="detail-section">
        <h2>Gestão da demanda no Hub</h2>
        <p>O tipo e a situação do 1Doc são preservados. A situação abaixo é interna ao Hub.</p>
        {user.permissions.includes('demands.write') ? (
          <form onSubmit={save} className="demand-form">
            <label>
              Classificação no Hub
              <select name="kind" defaultValue={String(row.kind ?? 'SUPORTE')}>
                <option value="SUPORTE">Suporte</option>
                <option value="AQUISICAO">Aquisição</option>
                <option value="OUTRA">Outra</option>
              </select>
            </label>
            <label>
              Situação no Hub
              <select name="status" defaultValue={String(row.status)}>
                {['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDA'].map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Observações internas
              <textarea name="notes" defaultValue={String(row.notes)} maxLength={50000} rows={4} />
            </label>
            <Button disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</Button>
            <p role="status">{message}</p>
          </form>
        ) : (
          <p className="captured-text">{display(row.notes)}</p>
        )}
      </section>
      <div className="section-heading">
        <h2>Despachos ({entities(row.dispatches).length})</h2>
      </div>
      {entities(row.dispatches).map((dispatch) => (
        <article className="detail-section" key={dispatch.id}>
          <h3>{display(dispatch.title)}</h3>
          <p>
            {display(dispatch.author)} · {display(dispatch.dateLabel)}
          </p>
          <p className="captured-text">{display(dispatch.content)}</p>
          <CapturedData data={object(dispatch.metadata)} />
          <details>
            <summary>Contexto e metadados do despacho</summary>
            <pre className="captured-text">{JSON.stringify(dispatch.metadata, null, 2)}</pre>
          </details>
        </article>
      ))}
      <p className="notice">
        A coleta inclui os despachos carregados na página. Nova coleta atualiza esta demanda e
        preserva os anteriores. Versões das coletas ficam armazenadas para rastreabilidade.
      </p>
    </>
  );
}

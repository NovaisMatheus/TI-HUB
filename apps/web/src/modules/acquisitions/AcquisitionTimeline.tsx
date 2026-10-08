import { useState } from 'react';
import { Link } from 'react-router-dom';
import { entities, object, display, type Entity } from '../../types';
import { CapturedData } from '../demands/DemandDetail';

export function AcquisitionTimeline({ row }: { row: Entity }) {
  const [filter, setFilter] = useState('all'),
    [query, setQuery] = useState(''),
    [descending, setDescending] = useState(false);
  const timeline = entities(row.timeline).filter(
    (event) =>
      (filter === 'all' || event.source === filter) &&
      [event.title, event.description, event.author, object(event.dispatch).content]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(query.toLocaleLowerCase('pt-BR')),
  );
  const events = descending
    ? [
        ...timeline.filter((event) => event.occurredAt).reverse(),
        ...timeline.filter((event) => !event.occurredAt),
      ]
    : timeline;
  return (
    <section aria-label="Timeline do processo">
      <div className="timeline-controls">
        <label>
          Pesquisar na timeline
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Conteúdo, autor ou despacho"
          />
        </label>
        <label>
          Origem
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todas</option>
            <option value="1doc">Despachos do 1Doc</option>
            <option value="hub">Eventos do Hub</option>
          </select>
        </label>
        <label>
          Ordem
          <select
            value={descending ? 'desc' : 'asc'}
            onChange={(e) => setDescending(e.target.value === 'desc')}
          >
            <option value="asc">Mais antigos primeiro</option>
            <option value="desc">Mais recentes primeiro</option>
          </select>
        </label>
      </div>
      <p className="muted">
        Despachos usam a data de publicação do 1Doc. As descrições breves são trechos automáticos
        locais; o conteúdo completo permanece disponível.
      </p>
      <div className="timeline">
        {events.map((event) => {
          const dispatch = object(event.dispatch);
          return (
            <article key={event.id}>
              <time dateTime={typeof event.occurredAt === 'string' ? event.occurredAt : undefined}>
                {event.occurredAt
                  ? new Date(String(event.occurredAt)).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      ...(event.dateOnly
                        ? { year: 'numeric', month: '2-digit', day: '2-digit' }
                        : {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }),
                    })
                  : String(event.dateLabel || 'Publicação sem data disponível')}
              </time>
              <div>
                <span className="eyebrow">
                  {event.source === '1doc'
                    ? `1DOC · ${display(event.author)}`
                    : `HUB · ${display(event.user)}`}
                </span>
                <h3>{display(event.title)}</h3>
                <p className="source-text">{display(event.description)}</p>
                {dispatch.id && (
                  <details className="timeline-dispatch">
                    <summary>Abrir despacho completo e anexos</summary>
                    <p>Publicação no 1Doc: {display(event.dateLabel)}</p>
                    <p className="source-text">{String(dispatch.content ?? '')}</p>
                    <CapturedData data={object(dispatch.metadata)} />
                    {entities(object(dispatch.metadata).attachments).map((attachment, index) => {
                      const copy = entities(row.documents).find(
                        (doc) => attachment.fileId && doc.fileId === attachment.fileId,
                      );
                      return copy ? (
                        <p key={index}>
                          <a href={`/api/documents/${copy.id}/file`}>
                            Baixar cópia de {display(attachment.name)}
                          </a>
                        </p>
                      ) : null;
                    })}
                    {!!object(dispatch.metadata).signature && (
                      <p className="source-text">{String(object(dispatch.metadata).signature)}</p>
                    )}
                    {!!object(row.sourceDemand).id && (
                      <Link to={`/demands/${object(row.sourceDemand).id}`}>
                        Abrir demanda de origem
                      </Link>
                    )}
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!events.length && <p role="status">Nenhum evento encontrado com esses filtros.</p>}
    </section>
  );
}

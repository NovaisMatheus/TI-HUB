import { Link } from 'react-router-dom';
import { Badge, Button } from '@hub/ui';
import { Plus, ExternalLink } from 'lucide-react';
import type { SessionUser } from '@hub/types';
import { api } from '../services/api';
import { display, entities, type Catalog, type Entity } from '../types';
import { State } from './PageHeader';
import { RelatedList } from './RelatedList';
export function RecordTabs({
  tab,
  id,
  row,
  catalog,
  user,
  versions,
  hardware,
  network,
  setCreate,
  setNotice,
}: {
  tab: string;
  name: string;
  id: string;
  row: Entity;
  catalog: Catalog;
  user: SessionUser;
  versions: Entity[];
  hardware: Entity;
  network: Entity;
  setCreate: (name: string) => void;
  setNotice: (message: string) => void;
}) {
  return (
    <>
      {' '}
      {tab === 'Hardware' && (
        <section className="detail-section">
          <h2>Hardware</h2>
          <dl>
            {[
              ['cpu', 'Processador'],
              ['ram', 'Memória RAM'],
              ['storage', 'Armazenamento'],
              ['os', 'Sistema operacional'],
            ].map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{display(hardware[key])}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {tab === 'Rede' && (
        <section className="detail-section">
          <h2>Configuração de rede</h2>
          <dl>
            {['ip', 'mac', 'vlan', 'gateway'].map((key) => (
              <div key={key}>
                <dt>{key.toUpperCase()}</dt>
                <dd>{display(network[key])}</dd>
              </div>
            ))}
          </dl>
          <p className="muted">
            O status técnico é definido pela equipe e não representa conectividade ICMP.
          </p>
        </section>
      )}
      {tab === 'Histórico' && (
        <div className="timeline">
          {entities(row.history).length ? (
            entities(row.history).map((record) => (
              <article key={record.id}>
                <time>{display(record.occurredAt)}</time>
                <div>
                  <span className="eyebrow">
                    {display(record.type)} · {display(record.technician)}
                  </span>
                  <h3>
                    <Link to={`/maintenance/${record.id}`}>{display(record.problem)}</Link>
                  </h3>
                  <p>{display(record.diagnosis)}</p>
                  <p>{display(record.solution)}</p>
                  <Badge value={String(record.status)} />
                </div>
              </article>
            ))
          ) : (
            <State message="Nenhuma intervenção registrada." />
          )}
        </div>
      )}
      {tab === 'Observações' && (
        <section className="detail-section">
          <h2>Observações técnicas</h2>
          <p>{display(row.notes)}</p>
        </section>
      )}
      {tab === 'GLPI' && (
        <section className="detail-section">
          <h2>Integração GLPI</h2>
          <p>Adapter mock. Nenhum inventário real é consultado nesta versão.</p>
          <p>ID externo: {display(row.glpiId)}</p>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const result = await api<{ mode: string }>(`equipment/${id}/glpi`);
                setNotice(result.mode);
              } catch (e) {
                setNotice(e instanceof Error ? e.message : 'Falha.');
              }
            }}
          >
            Consultar adapter GLPI
          </Button>
        </section>
      )}
      {tab === 'Documentos' && (
        <section className="detail-section">
          <div className="section-heading">
            <h2>Referências documentais</h2>
            {catalog.documents && user.permissions.includes('documents.write') && (
              <Button variant="outline" onClick={() => setCreate('documents')}>
                <Plus size={14} /> Vincular documento
              </Button>
            )}
          </div>
          {entities(row.documents).map((doc) => (
            <a
              className="related-row"
              key={doc.id}
              href={String(doc.url)}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                {display(doc.title)} · {display(doc.provider)}
              </span>
              <ExternalLink size={16} />
            </a>
          ))}
          {!entities(row.documents).length && <p className="muted">Nenhum documento vinculado.</p>}
        </section>
      )}
      {tab === 'Versões' &&
        versions.map((v) => (
          <section key={v.id} className="detail-section editorial-content">
            <div className="section-heading">
              <h2>Versão {display(v.version)}</h2>
              <span>{display(v.createdAt)}</span>
            </div>
            <p>{display(v.content)}</p>
          </section>
        ))}
      {tab === 'Timeline' && (
        <div className="timeline">
          {entities(row.timeline).map((event) => (
            <article key={event.id}>
              <time>{display(event.occurredAt)}</time>
              <div>
                <span className="eyebrow">
                  {display(event.supplier)} · {display(event.user)}
                </span>
                <h3>{display(event.title)}</h3>
                <p>{display(event.description)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === 'Propostas' && (
        <RelatedList
          title="Propostas recebidas"
          rows={entities(row.proposals)}
          resource="proposals"
        />
      )}
      {tab === 'Análises' && (
        <RelatedList title="Análises técnicas" rows={entities(row.analyses)} resource="analyses" />
      )}
      {tab === 'Empenhos' && (
        <RelatedList title="Empenhos" rows={entities(row.commitments)} resource="commitments" />
      )}
      {tab === 'Conferências' && (
        <RelatedList
          title="Conferências técnicas"
          rows={entities(row.inspections)}
          resource="inspections"
        />
      )}
    </>
  );
}

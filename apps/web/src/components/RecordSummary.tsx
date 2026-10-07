import { Link } from 'react-router-dom';
import { Badge, Button } from '@hub/ui';
import type { SessionUser } from '@hub/types';
import { send } from '../services/api';
import { display, entities, object, type Resource, type Catalog, type Entity } from '../types';
import { Evaluation } from '../modules/acquisitions/Evaluation';
import { RelatedList } from './RelatedList';
export function RecordSummary({
  name,
  id,
  row,
  config,
  catalog,
  user,
  canWrite,
  versions,
  hardware,
  network,
  setNotice,
}: {
  name: string;
  id: string;
  row: Entity;
  config: Resource;
  catalog: Catalog;
  user: SessionUser;
  canWrite: boolean;
  versions: Entity[];
  hardware: Entity;
  network: Entity;
  setNotice: (message: string) => void;
}) {
  const tab = 'Resumo';
  return (
    <>
      {' '}
      {tab === 'Resumo' && (
        <>
          {name === 'analyses' || name === 'inspections' ? (
            <Evaluation
              key={id}
              item={row}
              inspection={name === 'inspections'}
              canWrite={canWrite}
            />
          ) : (
            <div className="detail-grid">
              <section className="detail-section">
                <h2>Informações do registro</h2>
                <dl>
                  {config.fields
                    .filter(
                      (f) =>
                        !['content', 'requirements', 'ip', 'cpu', 'ram', 'storage', 'os'].includes(
                          f.name,
                        ),
                    )
                    .map((f) => (
                      <div key={f.name}>
                        <dt>{f.label}</dt>
                        <dd>
                          {f.name.endsWith('Id')
                            ? display(row[f.name.slice(0, -2)] ?? row[f.name])
                            : display(row[f.name])}
                        </dd>
                      </div>
                    ))}
                </dl>
                {row.source === 'GLPI_MOCK' && (
                  <p className="notice">Fonte: GLPI · adapter mock · sem sincronização externa</p>
                )}
              </section>
              <aside className="detail-section">
                <span className="eyebrow">RASTREABILIDADE</span>
                <h2>Contexto técnico</h2>
                <p>Registrado em {display(row.createdAt)}</p>
                <p>Atualizado em {display(row.updatedAt)}</p>
                <p className="muted">
                  Alterações são auditadas. Histórico técnico e logs administrativos permanecem
                  separados.
                </p>
                {row.processId && catalog.acquisitions ? (
                  <Link to={`/acquisitions/${row.processId}`} className="text-link">
                    Abrir processo relacionado →
                  </Link>
                ) : null}
                {name === 'equipment' && (
                  <>
                    <h3>Rede</h3>
                    <p>{display(network.ip)}</p>
                    <h3>Hardware</h3>
                    <p>
                      {display(hardware.cpu)} · {display(hardware.ram)}
                    </p>
                  </>
                )}
              </aside>
            </div>
          )}
          {versions.length > 0 && (
            <section className="detail-section editorial-content">
              <div className="section-heading">
                <h2>Conteúdo vigente</h2>
                <Badge value={`VERSAO_${versions[0].version}`} />
              </div>
              <p>{display(versions[0].content)}</p>
              {entities(versions[0].specificationRequirement_version).map((r) => (
                <div key={r.id} className="related-row">
                  {display(r.group)} · {display(r.field)}
                  <span>
                    {display(r.operator)} {display(r.value)} {r.unit as string}
                  </span>
                </div>
              ))}
            </section>
          )}
          {name === 'suppliers' && (
            <>
              <RelatedList
                title="Participações e propostas"
                rows={entities(row.proposals)}
                resource="proposals"
              />
              <RelatedList
                title="Empenhos"
                rows={entities(row.commitments)}
                resource="commitments"
              />
            </>
          )}
          {name === 'proposals' && (
            <section className="detail-section">
              <h2>Produtos ofertados</h2>
              {entities(row.proposalItem_proposal).map((r) => (
                <article key={r.id}>
                  <h3>
                    {display(r.brand)} · {display(r.model)}
                  </h3>
                  <p>{display(r.offeredDescription)}</p>
                  <p>
                    Quantidade: {display(r.quantity)} · Preço unitário: R$ {display(r.price)}
                  </p>
                </article>
              ))}
            </section>
          )}
          {name === 'requests' && (
            <section className="detail-section">
              <h2>Itens requisitados</h2>
              {entities(row.purchaseRequestItem_request).map((r) => (
                <div key={r.id} className="related-row">
                  {display(r.description)}
                  <span>
                    {display(r.quantity)} unidades · v
                    {display(object(r.specificationVersion).version)}
                  </span>
                </div>
              ))}
            </section>
          )}
          {name === 'commitments' && (
            <section className="detail-section">
              <h2>Itens empenhados</h2>
              {entities(row.commitmentItem_commitment).map((r) => (
                <div key={r.id} className="related-row">
                  {display(r.proposalItem)}
                  <span>
                    {display(r.quantity)} unidades · R$ {display(r.value)}
                  </span>
                </div>
              ))}
            </section>
          )}
          {name === 'recommendations' && user.permissions.includes('knowledge.write') && (
            <section className="detail-section">
              <h2>Resultado da aplicação</h2>
              <p>O feedback é uma referência e preserva o conteúdo da recomendação.</p>
              <div className="equipment-actions">
                {[
                  ['FUNCIONOU', 'Funcionou'],
                  ['PARCIALMENTE', 'Parcialmente'],
                  ['NAO_RESOLVEU', 'Não resolveu'],
                  ['NAO_SE_APLICAVA', 'Não se aplicava'],
                ].map(([result, label]) => (
                  <Button
                    variant="outline"
                    key={result}
                    onClick={async () => {
                      try {
                        await send(`recommendations/${id}/feedback`, { result, notes: '' });
                        setNotice('Feedback registrado.');
                      } catch (e) {
                        setNotice(e instanceof Error ? e.message : 'Falha.');
                      }
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

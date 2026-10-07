import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button } from '@hub/ui';
import { send } from '../../services/api';
import { display, entities, object, type Entity } from '../../types';
export function Evaluation({
  item,
  inspection = false,
  canWrite,
}: {
  item: Entity;
  inspection?: boolean;
  canWrite: boolean;
}) {
  const client = useQueryClient();
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const rows = entities(
    inspection ? item.inspectionItem_inspection : item.analysisRequirementResult_analysis,
  );
  const closed = !!item.concludedAt;
  async function save(event: React.FormEvent<HTMLFormElement>, row: Entity) {
    event.preventDefault();
    setMessage('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    try {
      await send(
        `${inspection ? 'inspections' : 'analyses'}/${item.id}/evaluate`,
        { ...data, [inspection ? 'itemId' : 'resultId']: row.id },
        'PATCH',
      );
      await client.invalidateQueries();
      setMessage('Avaliação registrada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar.');
    } finally {
      setBusy(false);
    }
  }
  async function conclude(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await send(
        `analyses/${item.id}/conclude`,
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      await client.invalidateQueries();
      setMessage('Conclusão técnica registrada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao concluir.');
    } finally {
      setBusy(false);
    }
  }
  const counts = ['ATENDE', 'DIVERGENCIA', 'PENDENTE'].map((result) => ({
    result,
    count: rows.filter((r) => r.result === result).length,
  }));
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{inspection ? 'Ofertado × entregue' : 'Requisito × produto ofertado'}</h2>
          <p>
            {inspection
              ? 'Registre as características conferidas presencialmente.'
              : 'A versão do descritivo utilizada nesta análise permanece preservada.'}
          </p>
        </div>
      </div>
      <div className="evaluation-summary">
        {counts.map((c) => (
          <span key={c.result}>
            <strong>{c.count}</strong> <Badge value={c.result} />
          </span>
        ))}
      </div>
      <div className="requirements">
        {rows.map((row) => {
          const requirement = object(row.requirement),
            proposal = object(object(row.commitmentItem).proposalItem);
          return (
            <form key={row.id} className="requirement-row" onSubmit={(event) => save(event, row)}>
              <div className="requirement-side">
                <span className="eyebrow">
                  {inspection ? 'PRODUTO OFERTADO' : display(requirement.group)}
                </span>
                <h3>
                  {inspection
                    ? `${display(proposal.brand)} ${display(proposal.model)}`
                    : display(requirement.field)}
                </h3>
                <p>
                  {inspection
                    ? display(proposal.offeredDescription)
                    : `${display(requirement.operator)} ${display(requirement.value)} ${requirement.unit ?? ''}`}
                </p>
                <Badge value={String(row.result)} />
              </div>
              <div className="requirement-inputs">
                {inspection ? (
                  <>
                    <label>
                      Produto entregue
                      <textarea
                        name="deliveredDescription"
                        required
                        defaultValue={String(row.deliveredDescription ?? '')}
                        disabled={!canWrite}
                      />
                    </label>
                    <label>
                      Características verificadas
                      <textarea
                        name="verifiedCharacteristics"
                        required
                        defaultValue={String(row.verifiedCharacteristics ?? '')}
                        disabled={!canWrite}
                      />
                    </label>
                    <label>
                      Divergências
                      <textarea
                        name="divergences"
                        defaultValue={String(row.divergences ?? '')}
                        disabled={!canWrite}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Característica ofertada
                      <input
                        name="offered"
                        defaultValue={String(row.offered ?? '')}
                        disabled={!canWrite || closed}
                      />
                    </label>
                    <label>
                      Motivo / evidência
                      <textarea
                        name="reason"
                        defaultValue={String(row.reason ?? '')}
                        disabled={!canWrite || closed}
                      />
                    </label>
                    <label>
                      Equivalência ou superioridade técnica
                      <input
                        name="equivalenceNotes"
                        defaultValue={String(row.equivalenceNotes ?? '')}
                        disabled={!canWrite || closed}
                      />
                    </label>
                  </>
                )}
                <div className="evaluation-action">
                  <select
                    aria-label="Resultado técnico"
                    name="result"
                    defaultValue={String(row.result)}
                    disabled={!canWrite || closed}
                  >
                    <option value="ATENDE">Atende</option>
                    <option value="DIVERGENCIA">Não atende — divergência</option>
                    <option value="PENDENTE">Pendente de verificação</option>
                  </select>
                  {canWrite && !closed && (
                    <Button variant="outline" disabled={busy}>
                      Salvar avaliação
                    </Button>
                  )}
                </div>
              </div>
            </form>
          );
        })}
      </div>
      {!inspection && (
        <div className="conclusion-box">
          <h2>Conclusão do técnico</h2>
          <p>A contagem auxilia a avaliação. A conclusão final é registrada manualmente.</p>
          {closed ? (
            <>
              <Badge value={String(item.conclusion)} />
              <p>{display(item.notes)}</p>
            </>
          ) : canWrite ? (
            <form onSubmit={conclude}>
              <select name="conclusion" aria-label="Conclusão final">
                <option value="PENDENTE">Pendente de verificação</option>
                <option value="DIVERGENCIA">Não atende — divergência</option>
                <option value="ATENDE">Atende</option>
              </select>
              <textarea
                name="notes"
                required
                placeholder="Fundamente a conclusão técnica…"
                aria-label="Fundamentação da conclusão"
              />
              <Button disabled={busy}>Concluir análise manualmente</Button>
            </form>
          ) : (
            <p>Seu perfil permite consulta.</p>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </>
  );
}

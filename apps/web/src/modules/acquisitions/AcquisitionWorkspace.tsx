import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@hub/ui';
import type { SessionUser } from '@hub/types';
import { send } from '../../services/api';
import { display, entities, object, type Entity } from '../../types';
import { CapturedData } from '../demands/DemandDetail';

type Requirement = {
  group: string;
  field: string;
  operator: string;
  value: string;
  unit: string;
  valueType: string;
};
const blank = (): Requirement => ({
  group: '',
  field: '',
  operator: '>=',
  value: '',
  unit: '',
  valueType: 'texto',
});
export function AcquisitionWorkspace({
  row,
  user,
  sourceOnly = false,
}: {
  row: Entity;
  user: SessionUser;
  sourceOnly?: boolean;
}) {
  const client = useQueryClient(),
    navigate = useNavigate();
  const request = object(row.request),
    items = entities(request.purchaseRequestItem_request);
  const item = items[0],
    version = object(item?.specificationVersion);
  const [content, setContent] = useState(String(version.content ?? ''));
  const [quantity, setQuantity] = useState(String(item?.quantity ?? ''));
  const [requirements, setRequirements] = useState<Requirement[]>(() => {
    const existing = entities(version.specificationRequirement_version);
    return existing.length
      ? existing.map((r) => ({
          group: String(r.group),
          field: String(r.field),
          operator: String(r.operator),
          value: String(r.value),
          unit: String(r.unit ?? ''),
          valueType: String(r.valueType ?? 'texto'),
        }))
      : [blank()];
  });
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const source = object(row.sourceDemand);
  const canWrite = user.permissions.includes('acquisition.write');
  const canReview = canWrite && items.length === 1 && !entities(row.analyses).length;
  async function review(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (requirements.some((r) => Object.values(r).some((v) => /[|\n\r]/.test(v))))
        throw new Error(
          'Os campos de requisito não podem conter barra vertical nem quebra de linha.',
        );
      await send(`acquisitions/${row.id}/specification`, {
        content,
        quantity: Number(quantity),
        requirements: requirements
          .map((r) => [r.group, r.field, r.operator, r.value, r.unit, r.valueType].join(' | '))
          .join('\n'),
      });
      await client.invalidateQueries();
      setMessage('Descritivo conferido. Cadastre a proposta e inicie a análise do produto.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao conferir.');
    } finally {
      setBusy(false);
    }
  }
  async function analyse(product: Entity) {
    setBusy(true);
    setMessage('');
    try {
      const created = await send<Entity>('records/analyses', {
        processId: row.id,
        proposalItemId: product.id,
        specificationVersionId: version.id,
        notes: '',
      });
      await client.invalidateQueries();
      navigate(`/analyses/${created.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao iniciar análise.');
    } finally {
      setBusy(false);
    }
  }
  if (sourceOnly)
    return (
      <section className="detail-section">
        <h2>Documento original e despachos</h2>
        {source.id ? (
          <>
            <p>
              <Link to={`/demands/${source.id}`}>
                {display(source.documentType)} {display(source.number)} · {display(source.title)}
              </Link>
            </p>
            <p>
              Solicitante: {display(source.requester)} · Situação no 1Doc:{' '}
              {display(source.sourceStatus)}
            </p>
            <p className="source-text">{String(source.description ?? '')}</p>
            <CapturedData data={object(source.metadata)} />
            {entities(source.dispatches).map((dispatch) => (
              <details key={dispatch.id} className="acquisition-document">
                <summary>
                  {display(dispatch.title)} · {display(dispatch.author)} ·{' '}
                  {display(dispatch.dateLabel)}
                </summary>
                <p className="source-text">{String(dispatch.content ?? '')}</p>
                <CapturedData data={object(dispatch.metadata)} />
                {!!object(dispatch.metadata).signature && (
                  <p className="source-text">{String(object(dispatch.metadata).signature)}</p>
                )}
              </details>
            ))}
          </>
        ) : (
          <p>Este processo foi cadastrado manualmente e não tem uma demanda 1Doc vinculada.</p>
        )}
      </section>
    );
  return (
    <>
      <section className="detail-section">
        <h2>Requisição e descritivo</h2>
        <p>
          <Link to={`/requests/${request.id}`}>{display(request.number)}</Link> ·{' '}
          <Link to={`/specifications/${object(version.specification).id}`}>
            Descritivo · versão {display(version.version)}
          </Link>
        </p>
        <p className="source-text">{String(request.description ?? '')}</p>
        <p>
          Confira os anexos abaixo e os despachos na aba “Origem e despachos”. Quantidades e
          requisitos precisam ser confirmados pela equipe.
        </p>
        <form onSubmit={review} className="acquisition-review">
          <label>
            Texto do descritivo
            <textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={200000}
              disabled={!canReview || busy}
            />
          </label>
          <label>
            Quantidade requisitada
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!canReview || busy}
            />
          </label>
          <h3>Requisitos para comparação</h3>
          {requirements.map((requirement, index) => (
            <div key={index} className="acquisition-requirement">
              {(['group', 'field', 'operator', 'value', 'unit'] as const).map((key) => (
                <label key={key}>
                  {
                    {
                      group: 'Grupo',
                      field: 'Característica',
                      operator: 'Comparação',
                      value: 'Exigência',
                      unit: 'Unidade',
                    }[key]
                  }
                  <input
                    value={requirement[key]}
                    required={key !== 'unit'}
                    disabled={!canReview || busy}
                    onChange={(e) =>
                      setRequirements((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, [key]: e.target.value } : r)),
                      )
                    }
                  />
                </label>
              ))}
              {canReview && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={requirements.length === 1 || busy}
                  onClick={() => setRequirements((rows) => rows.filter((_, i) => i !== index))}
                >
                  Remover
                </Button>
              )}
            </div>
          ))}
          {canReview ? (
            <div className="equipment-actions">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setRequirements((rows) => [...rows, blank()])}
              >
                Adicionar requisito
              </Button>
              <Button type="submit" disabled={busy}>
                Conferir descritivo e quantidade
              </Button>
            </div>
          ) : (
            <p className="muted">
              {entities(row.analyses).length
                ? 'Versão preservada porque já existem análises neste processo.'
                : 'Para editar, é necessário acesso de escrita e uma requisição com um item.'}
            </p>
          )}
        </form>
      </section>
      {user.permissions.includes('documents.read') && (
        <AcquisitionDocuments
          documents={entities(row.documents)}
          user={user}
          onUseText={canReview ? setContent : undefined}
        />
      )}
      <section className="detail-section">
        <h2>Orçamentos e análises</h2>
        <p>
          Os arquivos de orçamento ficam preservados abaixo do descritivo. Registre fornecedor,
          produto, quantidade e preço em “Proposta”; os valores não são presumidos a partir do
          anexo.
        </p>
        {entities(row.proposals).map((proposal) => (
          <article className="acquisition-document" key={proposal.id}>
            <h3>
              <Link to={`/proposals/${proposal.id}`}>{display(proposal.supplier)}</Link>
            </h3>
            {entities(proposal.proposalItem_proposal).map((product) => (
              <div key={product.id}>
                <p>
                  {display(product.brand)} {display(product.model)} · Quantidade{' '}
                  {display(product.quantity)} · R$ {display(product.price)}
                </p>
                <p className="source-text">{String(product.offeredDescription ?? '')}</p>
                {typeof product.manufacturerUrl === 'string' &&
                  /^https?:\/\//.test(product.manufacturerUrl) && (
                    <p>
                      <a href={product.manufacturerUrl} target="_blank" rel="noreferrer">
                        Referência do fabricante ↗
                      </a>
                    </p>
                  )}
                {user.permissions.includes('analysis.write') && (
                  <Button
                    variant="outline"
                    disabled={busy || !entities(version.specificationRequirement_version).length}
                    onClick={() => analyse(product)}
                  >
                    Analisar este produto
                  </Button>
                )}
              </div>
            ))}
          </article>
        ))}
        {!entities(row.proposals).length && (
          <p className="muted">
            Nenhuma proposta cadastrada. Confira o descritivo, cadastre o fornecedor e registre a
            proposta.
          </p>
        )}
      </section>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </>
  );
}

export function AcquisitionDocuments({
  documents,
  user,
  onUseText,
  heading = 'Descritivos, orçamentos e documentos',
}: {
  documents: Entity[];
  user: Pick<SessionUser, 'permissions'>;
  onUseText?: (text: string) => void;
  heading?: string;
}) {
  const client = useQueryClient();
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  async function upload(doc: Entity, file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      if (!file.size || file.size > 8 * 1024 * 1024)
        throw new Error('Envie um arquivo de até 8 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer()),
        chunks: string[] = [];
      for (let offset = 0; offset < bytes.length; offset += 32768)
        chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)));
      await send(`documents/${doc.id}/upload`, {
        name: file.name,
        dataBase64: btoa(chunks.join('')),
      });
      await client.invalidateQueries();
      setMessage('Arquivo anexado. Confira o texto extraído.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao anexar.');
    } finally {
      setBusy(false);
    }
  }
  async function category(doc: Entity, value: string) {
    setBusy(true);
    try {
      await send(`records/documents/${doc.id}`, { category: value }, 'PATCH');
      await client.invalidateQueries();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao classificar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="detail-section">
      <h2>{heading}</h2>
      <p>
        PDF, DOCX, XLSX, TXT e CSV têm extração de texto. Arquivos digitalizados ou formatos sem
        texto precisam de conferência manual. A categoria inicial é sugerida pelo nome.
      </p>
      {documents.map((doc) => {
        const file = object(doc.file);
        return (
          <article key={doc.id} className="acquisition-document">
            <h3>{display(doc.title)}</h3>
            <p className="source-text">{String(doc.description ?? '')}</p>
            <div className="equipment-actions">
              {typeof doc.url === 'string' && /^https?:\/\//i.test(doc.url) && (
                <a href={doc.url} target="_blank" rel="noreferrer">
                  Abrir original ↗
                </a>
              )}
              {!!doc.fileId && (
                <a href={`/api/documents/${doc.id}/file`}>Baixar cópia do arquivo</a>
              )}
              {user.permissions.includes('documents.write') && (
                <label>
                  Categoria{' '}
                  <select
                    value={String(doc.category ?? 'OUTRO')}
                    disabled={busy}
                    onChange={(e) => category(doc, e.target.value)}
                  >
                    {[
                      'OUTRO',
                      'REQUISICAO',
                      'DESCRITIVO',
                      'ORCAMENTO',
                      'PROPOSTA',
                      'PARECER',
                      'REFERENCIA',
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <p>
              {file.id
                ? `Extração: ${display(file.extractionStatus)} · ${display(file.size)} bytes`
                : 'Arquivo ainda não copiado. Atualize a coleta com a extensão ou anexe uma cópia.'}
            </p>
            {!!file.extractedText && (
              <details>
                <summary>Ver texto extraído</summary>
                <p className="source-text">{String(file.extractedText)}</p>
              </details>
            )}
            {!!file.extractedText && onUseText && (
              <Button
                variant="outline"
                onClick={() => {
                  onUseText(`Anexo: ${doc.title}\n${file.extractedText}`);
                  setMessage(
                    'Texto carregado no descritivo. Confira os requisitos e salve a revisão.',
                  );
                }}
              >
                Usar no descritivo para conferência
              </Button>
            )}
            {user.permissions.includes('documents.write') && (
              <label className="file-upload">
                {file.id ? 'Substituir cópia' : 'Anexar cópia'}{' '}
                <input
                  type="file"
                  disabled={busy}
                  onChange={(e) => {
                    void upload(doc, e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </article>
        );
      })}
      {!documents.length && <p>Nenhum documento vinculado.</p>}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </section>
  );
}

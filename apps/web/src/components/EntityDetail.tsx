import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button } from '@hub/ui';
import { ArrowLeft, Pencil, Plus, Copy, Monitor, Sparkles } from 'lucide-react';
import type { SessionUser } from '@hub/types';
import { api, send } from '../services/api';
import { display, entities, object, type Catalog, type Entity } from '../types';
import { PageHeader, State } from './PageHeader';
import { EntityForm } from './EntityForm';
import { RecordSummary } from './RecordSummary';
import { RecordTabs } from './RecordTabs';
import {
  AcquisitionWorkspace,
  AcquisitionDocuments,
} from '../modules/acquisitions/AcquisitionWorkspace';
export function EntityDetail({
  name,
  id,
  catalog,
  user,
}: {
  name: string;
  id: string;
  catalog: Catalog;
  user: SessionUser;
}) {
  const config = catalog[name];
  const [edit, setEdit] = useState(false),
    [create, setCreate] = useState<string>(),
    [tab, setTab] = useState('Resumo'),
    [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['record', name, id],
    queryFn: () => api<Entity>(`records/${name}/${id}`),
    enabled: !!config,
  });
  if (!config) return <State error message="Acesso não permitido." />;
  if (query.isLoading) return <State message="Carregando registro…" />;
  if (query.isError) return <State error message={query.error.message} />;
  const row = query.data!;
  const canWrite = user.permissions.includes(config.permission + '.write');
  const network = object(row.equipmentNetwork_equipment),
    hardware = object(row.equipmentHardware_equipment);
  const versions = entities(
    row.knowledgeArticleVersion_article ?? row.specificationVersion_specification,
  );
  async function remote(protocol: string) {
    try {
      const result = await send<{ message: string }>(`equipment/${id}/remote`, { protocol });
      setNotice(result.message);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Falha.');
    }
  }
  async function connection() {
    try {
      const result = await send<{ message: string }>(`equipment/${id}/connection`, {});
      setNotice(result.message);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Falha.');
    }
  }
  async function copy(value: unknown) {
    try {
      await navigator.clipboard.writeText(String(value));
      setNotice('Copiado para a área de transferência.');
    } catch {
      setNotice('Não foi possível copiar.');
    }
  }
  const title =
    name === 'commitments'
      ? `Empenho ${row.number}/${row.year}`
      : name === 'analyses'
        ? 'Análise técnica'
        : name === 'inspections'
          ? 'Conferência técnica'
          : display(row[config.title]);
  const tabs =
    name === 'equipment'
      ? ['Resumo', 'Hardware', 'Rede', 'Histórico', 'Documentos', 'GLPI', 'Observações']
      : name === 'acquisitions'
        ? [
            'Resumo',
            'Origem e despachos',
            'Propostas',
            'Análises',
            'Empenhos',
            'Conferências',
            'Timeline',
            'Documentos',
          ]
        : ['Resumo', 'Documentos', ...(versions.length ? ['Versões'] : [])];
  const createDefaults: Record<string, unknown> = {};
  if (create === 'maintenance') createDefaults.equipmentId = id;
  if (create === 'proposals') {
    createDefaults.processId = id;
    const requested = entities(object(row.request).purchaseRequestItem_request)[0];
    if (requested) {
      createDefaults.requestItemId = requested.id;
      createDefaults.quantity = requested.quantity;
    }
  }
  if (create === 'analyses') createDefaults.processId = id;
  if (create === 'commitments') {
    createDefaults.processId = id;
    createDefaults.requestId = row.requestId;
  }
  if (create === 'inspections') createDefaults.commitmentId = id;
  if (create === 'documents') {
    createDefaults.entityType = name;
    createDefaults.entityId = id;
    createDefaults.mimeType = 'text/html';
    createDefaults.provider = 'URL';
    createDefaults.description = 'Referência técnica';
    createDefaults.category = 'REFERENCIA';
  }
  if (create === 'recommendations') {
    createDefaults.maintenanceId = id;
    createDefaults.context = `Equipamento: ${display(row.equipment)}\nProblema: ${display(row.problem)}\nDiagnóstico: ${display(row.diagnosis)}\nSolução: ${display(row.solution)}`;
  }
  return (
    <>
      <Link className="back-link" to={`/${name}`}>
        <ArrowLeft size={14} /> {config.label}
      </Link>
      <PageHeader
        eyebrow={
          name === 'equipment'
            ? 'INVENTÁRIO · EQUIPAMENTO'
            : name === 'acquisitions'
              ? 'AQUISIÇÕES · PROCESSO'
              : 'REGISTRO TÉCNICO'
        }
        title={title}
        description={
          name === 'equipment'
            ? `${display(row.department)} · ${display(row.assignedUser)} · Patrimônio ${row.assetTag}`
            : name === 'acquisitions'
              ? `${row.number} · REQ ${display(object(row.request).number)} · ${display(object(row.request).department)}`
              : undefined
        }
        actions={
          <>
            {(row.status || row.result) && <Badge value={String(row.status ?? row.result)} />}
            <Button
              variant="outline"
              onClick={() => navigate(`/assistant?q=${encodeURIComponent(title)}`)}
            >
              <Sparkles size={16} /> Assistente
            </Button>
            {canWrite && !config.immutable && (
              <Button variant="outline" onClick={() => setEdit(true)}>
                <Pencil size={15} /> {versions.length ? 'Nova versão' : 'Editar'}
              </Button>
            )}
          </>
        }
      />
      {name === 'equipment' && (
        <div className="equipment-actions">
          <Button variant="outline" onClick={() => remote('rdp')}>
            <Monitor size={15} /> RDP
          </Button>
          <Button variant="outline" onClick={() => remote('vnc')}>
            VNC
          </Button>
          <Button variant="outline" onClick={() => remote('smb')}>
            Explorador
          </Button>
          <Button variant="outline" onClick={connection}>
            Testar conexão
          </Button>
          <Button variant="ghost" onClick={() => copy(network.ip)}>
            <Copy size={14} /> IP
          </Button>
          <Button variant="ghost" onClick={() => copy(row.hostname)}>
            Copiar hostname
          </Button>
          {user.permissions.includes('maintenance.write') && (
            <Button onClick={() => setCreate('maintenance')}>
              <Plus size={15} /> Nova intervenção
            </Button>
          )}
        </div>
      )}
      {name === 'acquisitions' && canWrite && (
        <div className="equipment-actions">
          {['proposals', 'analyses', 'commitments']
            .filter(
              (k) => catalog[k] && user.permissions.includes(catalog[k].permission + '.write'),
            )
            .map((k) => (
              <Button key={k} variant="outline" onClick={() => setCreate(k)}>
                <Plus size={14} /> {catalog[k].singular}
              </Button>
            ))}
        </div>
      )}
      {name === 'commitments' && user.permissions.includes('inspection.write') && (
        <Button onClick={() => setCreate('inspections')}>Registrar conferência</Button>
      )}
      {name === 'maintenance' && user.permissions.includes('knowledge.write') && (
        <Button variant="outline" onClick={() => setCreate('recommendations')}>
          Transformar em recomendação
        </Button>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div className="collection-tabs">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {name === 'acquisitions' && ['Resumo', 'Origem e despachos'].includes(tab) ? (
        <AcquisitionWorkspace
          key={`${id}-${tab}`}
          row={row}
          user={user}
          sourceOnly={tab === 'Origem e despachos'}
        />
      ) : name === 'acquisitions' && tab === 'Documentos' ? (
        <>
          <Button
            variant="outline"
            onClick={() => setCreate('documents')}
            disabled={!user.permissions.includes('documents.write')}
          >
            Vincular documento ou referência
          </Button>
          <AcquisitionDocuments documents={entities(row.documents)} user={user} />
        </>
      ) : tab === 'Resumo' ? (
        <RecordSummary
          name={name}
          id={id}
          row={row}
          config={config}
          catalog={catalog}
          user={user}
          canWrite={canWrite}
          versions={versions}
          hardware={hardware}
          network={network}
          setNotice={setNotice}
        />
      ) : (
        <RecordTabs
          tab={tab}
          name={name}
          id={id}
          row={row}
          catalog={catalog}
          user={user}
          versions={versions}
          hardware={hardware}
          network={network}
          setCreate={setCreate}
          setNotice={setNotice}
        />
      )}
      {edit && (
        <EntityForm
          resource={name}
          config={config}
          item={row}
          open
          onClose={() => setEdit(false)}
        />
      )}{' '}
      {create && catalog[create] && (
        <EntityForm
          resource={create}
          config={catalog[create]}
          defaults={createDefaults}
          open
          onClose={() => setCreate(undefined)}
          onSaved={(saved) => navigate(`/${create}/${saved.id}`)}
        />
      )}
    </>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button } from '@hub/ui';
import { Plus, Search, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import type { Page, SessionUser } from '@hub/types';
import { api } from '../services/api';
import { display, labels, type Catalog, type Entity } from '../types';
import { PageHeader, State } from './PageHeader';
import { EntityForm } from './EntityForm';
export function ResourceList({
  name,
  catalog,
  user,
}: {
  name: string;
  catalog: Catalog;
  user: SessionUser;
}) {
  const config = catalog[name];
  const [params] = useSearchParams();
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState(params.get('status') ?? ''),
    [sort, setSort] = useState('createdAt'),
    [page, setPage] = useState(1),
    [create, setCreate] = useState(false);
  const navigate = useNavigate();
  const result = useQuery({
    queryKey: ['records', name, query, status, sort, page],
    queryFn: () =>
      api<Page<Entity>>(
        `records/${name}?q=${encodeURIComponent(query)}&status=${status}&sort=${sort}&page=${page}`,
      ),
    enabled: !!config,
  });
  if (!config) return <State error message="Este módulo não está disponível para seu perfil." />;
  const canWrite = user.permissions.includes(config.permission + '.write');
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE TÉCNICO"
        title={config.label}
        description="Informação organizada. Histórico preservado. Decisões pela equipe."
        actions={
          canWrite &&
          name !== 'demands' && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={16} /> Novo registro
            </Button>
          )
        }
      />
      {name === 'demands' && (
        <p className="notice">
          Use a extensão Chrome para coletar um documento do 1Doc. O tipo original e os despachos
          são preservados. Configure a conexão em <Link to="/profile">Meu perfil</Link>.
        </p>
      )}
      <div className="collection-tabs">
        {name === 'equipment' ? (
          <>
            <span className="selected">Inventário</span>
            <Link to="/departments">Setores</Link>
            <Link to="/maintenance">Intervenções</Link>
          </>
        ) : ['knowledge', 'recommendations', 'solutions', 'scripts'].includes(name) ? (
          ['knowledge', 'recommendations', 'solutions', 'scripts', 'documents']
            .filter((k) => catalog[k])
            .map((k) => (
              <Link key={k} className={k === name ? 'selected' : ''} to={`/${k}`}>
                {catalog[k].label}
              </Link>
            ))
        ) : [
            'acquisitions',
            'specifications',
            'requests',
            'suppliers',
            'proposals',
            'analyses',
            'commitments',
            'inspections',
          ].includes(name) ? (
          [
            'acquisitions',
            'specifications',
            'requests',
            'suppliers',
            'proposals',
            'analyses',
            'commitments',
            'inspections',
          ]
            .filter((k) => catalog[k])
            .map((k) => (
              <Link key={k} className={k === name ? 'selected' : ''} to={`/${k}`}>
                {catalog[k].label}
              </Link>
            ))
        ) : null}
      </div>
      <div className="table-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder={`Buscar ${config.label.toLowerCase()}…`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="toolbar-filters">
          {config.fields.find((f) => f.name === 'status')?.options && (
            <select
              aria-label="Filtrar por status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os status</option>
              {config.fields
                .find((f) => f.name === 'status')!
                .options!.map((v) => (
                  <option key={v} value={v}>
                    {v.replaceAll('_', ' ')}
                  </option>
                ))}
            </select>
          )}
          <select aria-label="Ordenação" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="createdAt">Mais recentes</option>
            {config.columns
              .filter(
                (k) =>
                  !['supplier', 'process', 'proposalItem', 'commitment', 'responsible'].includes(k),
              )
              .map((k) => (
                <option key={k} value={k}>
                  {labels[k] ?? k}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="table-panel">
        {result.isLoading ? (
          <State message="Carregando registros…" />
        ) : result.isError ? (
          <State error message={result.error.message} />
        ) : !result.data?.items.length ? (
          <State message="Nenhum registro encontrado. Ajuste os filtros ou cadastre o primeiro registro." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map((k) => (
                    <th key={k}>{labels[k] ?? k}</th>
                  ))}
                  <th>
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((row) => (
                  <tr key={row.id}>
                    {config.columns.map((k, i) => (
                      <td key={k}>
                        {i === 0 ? (
                          <Link className="entity-title" to={`/${name}/${row.id}`}>
                            {display(row[k])}
                          </Link>
                        ) : ['status', 'result', 'conclusion'].includes(k) && row[k] ? (
                          <Badge value={String(row[k])} />
                        ) : (
                          display(row[k])
                        )}
                      </td>
                    ))}
                    <td>
                      <Link aria-label="Abrir registro" to={`/${name}/${row.id}`}>
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="table-footer">
          <span>
            {result.data?.total ?? 0} registros · página {page}
          </span>
          <div>
            <Button
              variant="ghost"
              aria-label="Página anterior"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Próxima página"
              disabled={!result.data || page * result.data.pageSize >= result.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </footer>
      </div>
      {create && (
        <EntityForm
          open
          resource={name}
          config={config}
          onClose={() => setCreate(false)}
          onSaved={(row) => navigate(`/${name}/${row.id}`)}
        />
      )}
    </>
  );
}

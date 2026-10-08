import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Badge, Button } from '@hub/ui';
import { Plus, Search, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import type { Page, SessionUser } from '@hub/types';
import { api } from '../services/api';
import { display, labels, type Catalog, type Entity } from '../types';
import { PageHeader, State } from './PageHeader';
import { EntityForm } from './EntityForm';
import { useDebounced } from '../services/use-debounced';
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
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '',
    status = params.get('status') ?? '',
    kind = params.get('kind') ?? '',
    sort = params.get('sort') ?? 'createdAt';
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.get('page')) || 1)));
  const [create, setCreate] = useState(false);
  const settledQuery = useDebounced(query);
  function filter(key: string, value: string, replace = false) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace },
    );
  }
  const navigate = useNavigate();
  const result = useQuery({
    queryKey: ['records', name, settledQuery, status, kind, sort, page],
    queryFn: ({ signal }) =>
      api<Page<Entity>>(
        `records/${name}?q=${encodeURIComponent(settledQuery)}&status=${encodeURIComponent(status)}&kind=${encodeURIComponent(kind)}&sort=${encodeURIComponent(sort)}&page=${page}`,
        { signal },
      ),
    enabled: !!config,
    placeholderData: keepPreviousData,
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
        {name === 'maintenance' && catalog.demands && (
          <Link to="/demands?kind=SUPORTE">Demandas de suporte</Link>
        )}
        {name === 'acquisitions' && catalog.demands && (
          <Link to="/demands?kind=AQUISICAO">Demandas de aquisição</Link>
        )}
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
              filter('q', e.target.value, true);
            }}
          />
        </label>
        <div className="toolbar-filters">
          {config.fields.find((f) => f.name === 'status')?.options && (
            <select
              aria-label="Filtrar por status"
              value={status}
              onChange={(e) => {
                filter('status', e.target.value);
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
          {name === 'demands' && (
            <select
              aria-label="Filtrar classificação"
              value={kind}
              onChange={(e) => {
                filter('kind', e.target.value);
              }}
            >
              <option value="">Todas as classificações</option>
              <option value="SUPORTE">Suporte</option>
              <option value="AQUISICAO">Aquisição</option>
              <option value="OUTRA">Outra</option>
            </select>
          )}
          <select
            aria-label="Ordenação"
            value={sort}
            onChange={(e) => filter('sort', e.target.value)}
          >
            <option value="createdAt">Mais recentes</option>
            {config.columns
              .filter((k) => config.fields.some((f) => f.name === k && !f.ref))
              .map((k) => (
                <option key={k} value={k}>
                  {labels[k] ?? k}
                </option>
              ))}
          </select>
        </div>
        {(query || status || kind) && (
          <Button variant="ghost" onClick={() => setParams({})}>
            Limpar filtros
          </Button>
        )}
      </div>
      <div className="table-panel" aria-busy={result.isFetching}>
        {result.isFetching && !result.isLoading && (
          <p className="muted" role="status">
            Atualizando registros…
          </p>
        )}
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
              disabled={page === 1 || result.isPlaceholderData}
              onClick={() => filter('page', String(page - 1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Próxima página"
              disabled={
                !result.data ||
                result.isPlaceholderData ||
                page * result.data.pageSize >= result.data.total
              }
              onClick={() => filter('page', String(page + 1))}
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

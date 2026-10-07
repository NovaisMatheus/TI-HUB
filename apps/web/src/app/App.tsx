import { useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@hub/types';
import { api, ApiError } from '../services/api';
import type { Catalog } from '../types';
import { Login } from '../modules/auth/Login';
import { Workspace } from '../layouts/Workspace';
import { Dashboard } from '../modules/dashboard/Dashboard';
import { Assistant } from '../modules/ai/Assistant';
import { Administration, Profile, Tools } from '../modules/administration/Administration';
import { ResourceList } from '../components/ResourceList';
import { EntityDetail } from '../components/EntityDetail';
import { State } from '../components/PageHeader';
import { DemandDetail } from '../modules/demands/DemandDetail';
function ResourceRoute({ catalog, user }: { catalog: Catalog; user: SessionUser }) {
  const { name = '', id } = useParams();
  if (name === 'demands' && id && catalog.demands)
    return <DemandDetail key={id} id={id} user={user} />;
  return id ? (
    <EntityDetail key={`${name}/${id}`} name={name} id={id} catalog={catalog} user={user} />
  ) : (
    <ResourceList key={name} name={name} catalog={catalog} user={user} />
  );
}
export function App() {
  const client = useQueryClient();
  const [search, setSearch] = useState(false);
  const session = useQuery({
    queryKey: ['session'],
    queryFn: () => api<SessionUser>('auth/me'),
    retry: false,
  });
  const catalog = useQuery({
    queryKey: ['catalog', session.data?.id],
    queryFn: () => api<Catalog>('catalog'),
    enabled: !!session.data,
  });
  if (session.isLoading) return <State message="Carregando workspace…" />;
  if (session.isError && !(session.error instanceof ApiError && session.error.status === 401))
    return (
      <State
        error
        message={`API indisponível: ${session.error.message}. Verifique se o backend está iniciado.`}
      />
    );
  if (!session.data)
    return (
      <Login
        onLogin={(user) => {
          client.setQueryData(['session'], user);
        }}
      />
    );
  if (catalog.isLoading) return <State message="Carregando módulos…" />;
  if (catalog.isError) return <State error message={catalog.error.message} />;
  const user = session.data;
  return (
    <Routes>
      <Route
        element={
          <Workspace
            user={user}
            onLogout={() => {
              client.setQueryData(['session'], null);
              client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
            }}
            searchOpen={search}
            setSearchOpen={setSearch}
          />
        }
      >
        <Route index element={<Dashboard user={user} onSearch={() => setSearch(true)} />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="administration" element={<Administration user={user} />} />
        <Route path="profile" element={<Profile user={user} />} />
        <Route path="tools" element={<Tools />} />
        <Route path=":name" element={<ResourceRoute catalog={catalog.data ?? {}} user={user} />} />
        <Route
          path=":name/:id"
          element={<ResourceRoute catalog={catalog.data ?? {}} user={user} />}
        />
      </Route>
    </Routes>
  );
}

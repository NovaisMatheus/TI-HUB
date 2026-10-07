import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Monitor,
  Wrench,
  FileCheck2,
  BookOpen,
  Search,
  Sparkles,
  ArrowRight,
  CircleHelp,
} from 'lucide-react';
import { Badge } from '@hub/ui';
import type { SessionUser } from '@hub/types';
import { api } from '../../services/api';
import { display, object, type Entity } from '../../types';
import { PageHeader, State } from '../../components/PageHeader';
interface DashboardData {
  equipment: number;
  maintenance: number;
  processes: Entity[];
  analyses: number;
  inspections: number;
  pops: Entity[];
  recommendations: Entity[];
}
export function Dashboard({ user, onSearch }: { user: SessionUser; onSearch: () => void }) {
  const result = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('dashboard'),
  });
  if (result.isLoading) return <State message="Preparando seu workspace…" />;
  if (result.isError) return <State error message={result.error.message} />;
  const data = result.data!;
  return (
    <>
      <PageHeader
        eyebrow="SEU WORKSPACE · UGB-TI"
        title={`Olá, ${user.name.split(' ')[0]}.`}
        description="Tudo o que você precisa para dar continuidade ao trabalho."
        actions={
          <span className="date-label">
            {new Date().toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'America/Sao_Paulo',
            })}
          </span>
        }
      />
      <div className="workspace-banner">
        <div>
          <span className="eyebrow">TECNOLOGIA CONECTADA. CONHECIMENTO PRESERVADO.</span>
          <h2>
            Um lugar para conectar
            <br />o trabalho da equipe.
          </h2>
          <p>Encontre equipamentos, recupere soluções e acompanhe as próximas decisões técnicas.</p>
          <button onClick={onSearch}>
            Pesquisar no Hub <ArrowRight size={16} />
          </button>
        </div>
        <div className="network-art" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <b />
          <b />
          <span className="art-label">
            UGB / TI
            <br />
            CONNECTED WORKSPACE
          </span>
        </div>
      </div>
      <div className="metric-strip">
        {[
          {
            label: 'Equipamentos',
            value: data.equipment,
            helper: 'no inventário',
            icon: Monitor,
            href: '/equipment',
          },
          {
            label: 'Em manutenção',
            value: data.maintenance,
            helper: 'atenção da equipe',
            icon: Wrench,
            href: '/equipment?status=EM_MANUTENCAO',
          },
          {
            label: 'Análises pendentes',
            value: data.analyses,
            helper: 'avaliação técnica',
            icon: FileCheck2,
            href: '/analyses',
          },
          {
            label: 'Conferências pendentes',
            value: data.inspections,
            helper: 'verificação de entrega',
            icon: CircleHelp,
            href: '/inspections',
          },
        ].map((metric) => (
          <Link key={metric.label} className="metric" to={metric.href}>
            <div>
              <metric.icon size={17} />
              <span>{metric.label}</span>
              <ArrowUpRight size={14} />
            </div>
            <strong>{metric.value.toString().padStart(2, '0')}</strong>
            <small>{metric.helper}</small>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ACOMPANHAMENTO</span>
              <h2>Aquisições em andamento</h2>
            </div>
            <Link className="text-link" to="/acquisitions">
              Ver processos <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="process-list">
            {data.processes.map((process, i) => (
              <Link key={process.id} to={`/acquisitions/${process.id}`}>
                <span className="process-index">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{display(process.title)}</strong>
                  <small>
                    {display(process.number)} <span>·</span>{' '}
                    {display(object(process.request).department)}
                  </small>
                </div>
                <Badge value={String(process.status)} />
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        </section>
        <section className="workspace-section shortcuts">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MENOS CLIQUES</span>
              <h2>Acesso rápido</h2>
            </div>
          </div>
          <button onClick={onSearch}>
            <Search size={18} />
            <span>Buscar equipamento</span>
            <kbd>⌃ K</kbd>
          </button>
          <Link to="/maintenance">
            <Wrench size={18} />
            <span>Registrar intervenção</span>
            <ArrowUpRight size={15} />
          </Link>
          <Link to="/analyses">
            <FileCheck2 size={18} />
            <span>Realizar análise técnica</span>
            <ArrowUpRight size={15} />
          </Link>
          <Link to="/knowledge">
            <BookOpen size={18} />
            <span>Consultar procedimento</span>
            <ArrowUpRight size={15} />
          </Link>
          <Link to="/assistant">
            <Sparkles size={18} />
            <span>Pesquisa inteligente</span>
            <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <div className="dashboard-grid knowledge-grid">
        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BASE DE CONHECIMENTO</span>
              <h2>Procedimentos atualizados</h2>
            </div>
            <Link className="text-link" to="/knowledge">
              Ver todos <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="knowledge-list">
            {data.pops.map((pop) => (
              <Link key={pop.id} to={`/knowledge/${pop.id}`}>
                <span className="document-icon">
                  <BookOpen size={19} />
                </span>
                <div>
                  <span className="eyebrow">{display(pop.code)} · PROCEDIMENTO OFICIAL</span>
                  <strong>{display(pop.title)}</strong>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        </section>
        <section className="workspace-section recommendations">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPERIÊNCIA DA EQUIPE</span>
              <h2>Recomendações técnicas</h2>
            </div>
          </div>
          {data.recommendations.slice(0, 2).map((rec) => (
            <Link key={rec.id} to={`/recommendations/${rec.id}`}>
              <span className="knowledge-source">Recomendação da equipe</span>
              <h3>{display(rec.title)}</h3>
              <p>{display(rec.description)}</p>
              <span className="text-link">
                Consultar orientação <ArrowUpRight size={14} />
              </span>
            </Link>
          ))}
        </section>
      </div>
      <footer className="workspace-footer">
        UGB TI Hub <span>Informação conectada, decisões pela equipe.</span>
        <span>Ambiente de desenvolvimento · dados fictícios</span>
      </footer>
    </>
  );
}

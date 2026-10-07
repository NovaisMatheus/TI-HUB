import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Wrench,
  Monitor,
  BookOpen,
  ShoppingBag,
  PanelsTopLeft,
  Hammer,
  Sparkles,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ChevronDown,
  LogOut,
  Network,
  Inbox,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@hub/ui';
import type { SessionUser } from '@hub/types';
import { CommandPalette } from '../components/CommandPalette';
import { ThemeControl } from '../components/ThemeControl';
import { ChatPanel } from '../modules/chat/ChatPanel';
import { send } from '../services/api';
const navigation = [
  { path: '/', label: 'Início', icon: Home },
  { path: '/demands', label: 'Demandas', icon: Inbox },
  { path: '/maintenance', label: 'Suporte', icon: Wrench },
  { path: '/equipment', label: 'Equipamentos', icon: Monitor },
  { path: '/knowledge', label: 'Conhecimento', icon: BookOpen },
  { path: '/acquisitions', label: 'Aquisições', icon: ShoppingBag },
  { path: '/systems', label: 'Sistemas', icon: PanelsTopLeft },
  { path: '/tools', label: 'Ferramentas', icon: Hammer },
  { path: '/assistant', label: 'Assistente', icon: Sparkles },
  { path: '/administration', label: 'Administração', icon: Settings2 },
];
export function Workspace({
  user,
  onLogout,
  searchOpen,
  setSearchOpen,
}: {
  user: SessionUser;
  onLogout: () => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false),
    [query, setQuery] = useState(''),
    [themeError, setThemeError] = useState('');
  const [chatOpen, setChatOpen] = useState(
    () => window.innerWidth >= 1100 || new URLSearchParams(location.search).has('chat'),
  );
  const canChat = user.permissions.includes('chat.read');
  const navigate = useNavigate();
  return (
    <div
      className={`workspace ${collapsed ? 'sidebar-collapsed' : ''} ${canChat && chatOpen ? 'chat-open' : ''}`}
    >
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-icon">
            <Network size={20} />
          </span>
          {!collapsed && (
            <strong>
              UGB <span>TI Hub</span>
            </strong>
          )}
        </Link>
        <button
          className="workspace-selector"
          onClick={() => navigate('/profile')}
          title="Meu perfil"
        >
          <span className="workspace-avatar">TI</span>
          {!collapsed && (
            <>
              <div>
                <strong>Workspace TI</strong>
                <small>Prefeitura Municipal</small>
              </div>
              <ChevronDown size={14} />
            </>
          )}
        </button>
        {!collapsed && <span className="nav-caption">WORKSPACE</span>}
        <nav>
          {navigation
            .filter(
              (item) =>
                (item.path !== '/administration' ||
                  user.permissions.includes('admin.audit.read')) &&
                (item.path !== '/demands' || user.permissions.includes('demands.read')),
            )
            .map((item) => (
              <NavLink
                end={item.path === '/'}
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={19} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.path === '/assistant' && <span className="nav-new">MOCK</span>}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            {!collapsed && (
              <>
                <span className="tiny-dot" /> Ambiente de desenvolvimento
              </>
            )}
          </div>
          <button className="user-profile" onClick={() => navigate('/profile')} title="Meu perfil">
            <span className="user-avatar">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </span>
            {!collapsed && (
              <div>
                <strong>{user.name}</strong>
                <small>Equipe UGB-TI</small>
              </div>
            )}
          </button>
          <Button
            variant="ghost"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}{' '}
            {!collapsed && 'Recolher menu'}
          </Button>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>UGB TI Hub</strong>
          </div>
          <div>
            <form
              className="global-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                setSearchOpen(true);
              }}
            >
              <input
                aria-label="Pesquisa global"
                placeholder="Pesquisar no Hub…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="submit" aria-label="Pesquisar" title="Pesquisar (Ctrl+K)">
                <Search size={16} />
              </button>
              <kbd>Ctrl K</kbd>
            </form>
            <ThemeControl key={user.id} user={user} />
            {canChat && (
              <Button
                variant="ghost"
                aria-label={chatOpen ? 'Recolher chat' : 'Abrir chat'}
                aria-expanded={chatOpen}
                aria-controls="hub-chat"
                onClick={() => setChatOpen((value) => !value)}
              >
                <MessageSquare size={18} />
              </Button>
            )}
            <Button
              variant="ghost"
              aria-label="Sair"
              onClick={async () => {
                try {
                  await send('auth/logout', {});
                  onLogout();
                } catch {
                  setThemeError('Falha ao encerrar a sessão. Tente novamente.');
                }
              }}
            >
              <LogOut size={16} />
            </Button>
          </div>
        </header>
        {themeError && <p className="notice">{themeError}</p>}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={searchOpen} setOpen={setSearchOpen} query={query} setQuery={setQuery} />
      {canChat && <ChatPanel key={user.id} user={user} open={chatOpen} setOpen={setChatOpen} />}
    </div>
  );
}

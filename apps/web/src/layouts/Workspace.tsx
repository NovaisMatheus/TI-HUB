import { useState, useEffect } from 'react';
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
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@hub/ui';
import type { SessionUser } from '@hub/types';
import { CommandPalette } from '../components/CommandPalette';
import { send } from '../services/api';
const navigation = [
  { path: '/', label: 'Início', icon: Home },
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
    [theme, setTheme] = useState(user.theme ?? localStorage.getItem('hub-theme') ?? 'system'),
    [themeError, setThemeError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  async function changeTheme(value: string) {
    setTheme(value);
    localStorage.setItem('hub-theme', value);
    try {
      await send('profile', { theme: value }, 'PATCH');
      setThemeError('');
    } catch {
      setThemeError('Tema aplicado localmente; falha ao salvar no perfil.');
    }
  }
  return (
    <div className={`workspace ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
                item.path !== '/administration' || user.permissions.includes('admin.audit.read'),
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
            <button className="global-search" onClick={() => setSearchOpen(true)}>
              <Search size={16} />
              <span>Pesquisar no Hub</span>
              <kbd>Ctrl K</kbd>
            </button>
            <div className="theme-control">
              <Sun size={15} />
              <select
                aria-label="Tema da interface"
                value={theme}
                onChange={(e) => changeTheme(e.target.value)}
              >
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
                <option value="system">Sistema</option>
              </select>
              {theme === 'dark' && <Moon size={14} />}
            </div>
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
      <CommandPalette open={searchOpen} setOpen={setSearchOpen} />
    </div>
  );
}

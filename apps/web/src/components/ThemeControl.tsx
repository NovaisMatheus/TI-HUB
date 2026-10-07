import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { SessionUser } from '@hub/types';
import { send } from '../services/api';

type Theme = 'light' | 'dark' | 'system';
const options = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const;
function storedTheme(user: SessionUser): Theme {
  try {
    const stored = localStorage.getItem(`hub-theme:${user.id}`);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* The profile still works when storage is unavailable. */
  }
  return user.theme ?? 'system';
}

export function ThemeControl({ user }: { user: SessionUser }) {
  const [theme, setTheme] = useState<Theme>(() => storedTheme(user));
  const [error, setError] = useState('');
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const active = useRef(true);
  const client = useQueryClient();
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  function changeTheme(value: Theme) {
    setTheme(value);
    setError('');
    try {
      localStorage.setItem(`hub-theme:${user.id}`, value);
    } catch {
      /* Optional cache. */
    }
    const current = ++revision.current;
    // Serialize writes so an earlier request cannot overwrite the latest selection.
    queue.current = queue.current.then(async () => {
      if (!active.current) return;
      try {
        await send('profile', { theme: value }, 'PATCH');
        if (active.current && revision.current === current) {
          client.setQueryData<SessionUser>(['session'], (session) =>
            session?.id === user.id ? { ...session, theme: value } : session,
          );
          setError('');
        }
      } catch {
        if (active.current && revision.current === current)
          setError('Tema aplicado neste dispositivo. Não foi possível salvar no perfil.');
      }
    });
  }
  return (
    <div className="theme-wrapper">
      <div className="theme-control" role="group" aria-label="Tema da interface">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={`Tema ${label}`}
            aria-pressed={theme === value}
            onClick={() => changeTheme(value)}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {error && (
        <span className="theme-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@hub/ui';
import type { Source } from '@hub/types';
import { Search, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
export function CommandPalette({
  open,
  setOpen,
  query,
  setQuery,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
}) {
  const [debounced, setDebounced] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [open, setOpen]);
  const results = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => api<Source[]>(`search?q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.length > 2,
  });
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Pesquisa global" initialFocusRef={inputRef}>
      <div className="palette-input">
        <Search size={20} />
        <input
          ref={inputRef}
          aria-label="Pesquisar registros"
          placeholder="Hostname, IP, patrimônio, POP, empenho…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>ESC</kbd>
      </div>
      <div className="palette-results">
        {query.trim().length < 3 ? (
          <p>Digite pelo menos 3 caracteres para pesquisar nos módulos autorizados.</p>
        ) : query !== debounced || results.isFetching ? (
          <p>Pesquisando…</p>
        ) : results.isError ? (
          <p role="alert">Não foi possível pesquisar.</p>
        ) : results.data?.length ? (
          results.data.map((s) => (
            <button
              key={s.href}
              onClick={() => {
                navigate(s.href);
                setOpen(false);
              }}
            >
              <span>
                <strong>{s.title}</strong>
                <small>{s.excerpt.slice(0, 100)}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))
        ) : (
          <p>Nenhum registro encontrado.</p>
        )}
      </div>
    </Dialog>
  );
}

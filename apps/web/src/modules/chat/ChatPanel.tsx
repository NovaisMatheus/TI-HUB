import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, X, Send, RefreshCw } from 'lucide-react';
import { Button } from '@hub/ui';
import type { SessionUser } from '@hub/types';
import { api, send } from '../../services/api';
interface Message {
  id?: string;
  name?: string;
  text?: string;
  createdAt?: string;
  createTime?: string;
  user?: { name: string };
  sender?: { displayName?: string; name?: string };
}
interface Messages {
  items?: Message[];
  messages?: Message[];
  nextCursor?: string;
  nextPageToken?: string;
}
interface Space {
  name: string;
  displayName?: string;
  spaceType?: string;
}
export function ChatPanel({
  user,
  open,
  setOpen,
}: {
  user: SessionUser;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const client = useQueryClient();
  const [tab, setTab] = useState<'team' | 'google'>(() =>
    new URLSearchParams(location.search).has('chat') ? 'google' : 'team',
  );
  const [space, setSpace] = useState(''),
    [older, setOlder] = useState<Message[]>([]),
    [next, setNext] = useState<string | undefined>();
  const [drafts, setDrafts] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const pending = useRef<{ text: string; target: string; id: string } | null>(null);
  const box = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true);
  const target = tab === 'team' ? 'chat/messages' : space ? `chat/google/${space}/messages` : '';
  const draft = drafts[target] ?? '';
  const status = useQuery({
    queryKey: ['chat-google-status', user.id],
    queryFn: () => api<{ configured: boolean; connected: boolean }>('chat/google/status'),
    enabled: open,
    retry: false,
  });
  const spaces = useQuery({
    queryKey: ['chat-google-spaces', user.id],
    queryFn: () => api<{ spaces?: Space[]; nextPageToken?: string }>('chat/google/spaces'),
    enabled: open && tab === 'google' && !!status.data?.connected && !!status.data.configured,
    retry: false,
  });
  const [moreSpaces, setMoreSpaces] = useState<Space[]>([]),
    [spacesToken, setSpacesToken] = useState<string | undefined>();
  const messages = useQuery({
    queryKey: ['chat-messages', user.id, target],
    queryFn: () => api<Messages>(target),
    enabled: open && !!target && (tab === 'team' || !!status.data?.connected),
    refetchInterval: open ? 5000 : false,
    retry: false,
  });
  const latest = messages.data?.items ?? [...(messages.data?.messages ?? [])].reverse();
  const all = [...new Map([...older, ...latest].map((m) => [m.id ?? m.name, m])).values()];
  useEffect(() => {
    if (nearBottom.current && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [all.length, open]);
  useEffect(() => {
    const callback = new URLSearchParams(location.search).get('chat');
    if (callback === 'google-error')
      setNotice(
        'A autorização Google não foi concluída. Tente conectar novamente e autorize as permissões solicitadas.',
      );
  }, []);
  function select(tabValue: 'team' | 'google', spaceValue = '') {
    setTab(tabValue);
    setSpace(spaceValue);
    setOlder([]);
    setNext(undefined);
    setNotice('');
    nearBottom.current = true;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !target || busy) return;
    setBusy(true);
    setNotice('');
    const sentText = draft;
    if (pending.current?.text !== sentText || pending.current.target !== target)
      pending.current = { text: sentText, target, id: crypto.randomUUID() };
    try {
      await send(target, { text: sentText, requestId: pending.current.id });
      setDrafts((values) => ({ ...values, [target]: '' }));
      pending.current = null;
      nearBottom.current = true;
      await client.invalidateQueries({ queryKey: ['chat-messages', user.id, target] });
    } catch (error) {
      setNotice(
        `${error instanceof Error ? error.message : 'Falha ao enviar.'} Seu texto foi preservado para tentar novamente.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadOlder() {
    setBusy(true);
    try {
      const token = next ?? messages.data?.nextCursor ?? messages.data?.nextPageToken;
      const page = await api<Messages>(
        `${target}?${tab === 'team' ? 'before' : 'pageToken'}=${encodeURIComponent(token ?? '')}`,
      );
      setOlder((values) => [...(page.items ?? [...(page.messages ?? [])].reverse()), ...values]);
      setNext(page.nextCursor ?? page.nextPageToken ?? '');
      nearBottom.current = false;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Falha ao carregar histórico.');
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  const canWrite = user.permissions.includes('chat.write');
  return (
    <aside
      id="hub-chat"
      className="chat-panel"
      aria-label="Chat para troca de ideias"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <header className="chat-heading">
        <div>
          <MessageSquare size={19} />
          <strong>Troca de ideias</strong>
        </div>
        <Button variant="ghost" aria-label="Recolher chat" onClick={() => setOpen(false)}>
          <X size={18} />
        </Button>
      </header>
      <div className="chat-tabs" role="group" aria-label="Origem da conversa">
        <button aria-pressed={tab === 'team'} onClick={() => select('team')}>
          Equipe Hub
        </button>
        <button aria-pressed={tab === 'google'} onClick={() => select('google')}>
          Google Chat
        </button>
      </div>
      {tab === 'team' ? (
        <p className="chat-caption">Conversa compartilhada pela equipe do Hub</p>
      ) : (
        <div className="chat-connection">
          {status.isLoading ? (
            <p>Verificando conexão…</p>
          ) : status.isError ? (
            <p role="alert">Não foi possível verificar a conexão.</p>
          ) : !status.data?.configured ? (
            <p>
              Google Chat aguarda configuração do administrador. A conversa da Equipe Hub já está
              disponível.
            </p>
          ) : !status.data.connected ? (
            <>
              <p>Conecte sua conta para conversar nos seus espaços.</p>
              {canWrite && (
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const result = await send<{ url: string }>('chat/google/connect', {});
                      const url = new URL(result.url);
                      if (url.origin !== 'https://accounts.google.com')
                        throw new Error('Endereço de autorização inválido.');
                      window.location.assign(result.url);
                    } catch (e) {
                      setNotice(e instanceof Error ? e.message : 'Falha.');
                      setBusy(false);
                    }
                  }}
                >
                  Conectar Google Chat
                </Button>
              )}
            </>
          ) : (
            <>
              <label>
                Espaço do Google Chat
                <select
                  aria-label="Espaço do Google Chat"
                  value={space}
                  disabled={busy}
                  onChange={(e) => select('google', e.target.value)}
                >
                  <option value="">Selecione uma conversa</option>
                  {[
                    ...new Map(
                      [...(spaces.data?.spaces ?? []), ...moreSpaces].map((s) => [s.name, s]),
                    ).values(),
                  ].map((s) => (
                    <option value={s.name} key={s.name}>
                      {s.displayName ||
                        `${s.spaceType === 'DIRECT_MESSAGE' ? 'Conversa direta' : 'Conversa'} · ${s.name.split('/')[1]}`}
                    </option>
                  ))}
                </select>
              </label>
              {(spacesToken ?? spaces.data?.nextPageToken) && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const page = await api<{ spaces?: Space[]; nextPageToken?: string }>(
                        `chat/google/spaces?pageToken=${encodeURIComponent(spacesToken ?? spaces.data?.nextPageToken ?? '')}`,
                      );
                      setMoreSpaces((values) => [...values, ...(page.spaces ?? [])]);
                      setSpacesToken(page.nextPageToken ?? '');
                    } catch {
                      setNotice('Falha ao carregar mais conversas.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Mais conversas
                </Button>
              )}
              {spaces.isError && <p role="alert">{spaces.error.message}</p>}
              <button
                className="chat-disconnect"
                onClick={async () => {
                  try {
                    await send('chat/google/connection', undefined, 'DELETE');
                    select('google');
                    setMoreSpaces([]);
                    setSpacesToken(undefined);
                    client.removeQueries({
                      predicate: (q) =>
                        q.queryKey[0] === 'chat-messages' &&
                        String(q.queryKey[2]).includes('google'),
                    });
                    client.removeQueries({ queryKey: ['chat-google-spaces', user.id] });
                    await status.refetch();
                  } catch {
                    setNotice('Não foi possível desconectar.');
                  }
                }}
              >
                Desconectar conta
              </button>
            </>
          )}
        </div>
      )}
      <div
        className="chat-messages"
        ref={box}
        onScroll={() => {
          if (box.current)
            nearBottom.current =
              box.current.scrollHeight - box.current.scrollTop - box.current.clientHeight < 60;
        }}
        aria-label="Mensagens da conversa"
      >
        {!!target && (
          <Button
            variant="ghost"
            aria-label="Atualizar mensagens"
            onClick={() => messages.refetch()}
          >
            <RefreshCw size={14} /> Atualizar
          </Button>
        )}
        {(next ?? messages.data?.nextCursor ?? messages.data?.nextPageToken) && (
          <Button variant="ghost" disabled={busy} onClick={loadOlder}>
            Mensagens anteriores
          </Button>
        )}
        {messages.isLoading && !!target && <p role="status">Carregando mensagens…</p>}
        {messages.isError && <p role="alert">{messages.error.message}</p>}
        {!messages.isLoading && !messages.isError && !!target && !all.length && (
          <p className="chat-empty">Comece a troca de ideias.</p>
        )}
        {all.map((message) => (
          <article key={message.id ?? message.name} className="chat-message">
            <strong>
              {message.user?.name ??
                message.sender?.displayName ??
                message.sender?.name ??
                'Participante'}
            </strong>
            <p>{message.text || 'Mensagem com cartão ou anexo. Consulte no Google Chat.'}</p>
            <time>
              {new Date(message.createdAt ?? message.createTime ?? '').toLocaleString('pt-BR')}
            </time>
          </article>
        ))}
      </div>
      {notice && (
        <p className="chat-notice" role="status">
          {notice}
        </p>
      )}
      {canWrite && !!target && (
        <form className="chat-compose" onSubmit={submit}>
          <textarea
            aria-label="Mensagem para troca de ideias"
            placeholder="Compartilhe uma ideia…"
            value={draft}
            maxLength={4000}
            disabled={busy}
            rows={3}
            onChange={(e) => setDrafts((values) => ({ ...values, [target]: e.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div>
            <small>Ctrl+Enter para enviar</small>
            <Button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar mensagem">
              <Send size={15} />
              {busy ? 'Enviando…' : 'Enviar'}
            </Button>
          </div>
        </form>
      )}
      <a
        className="chat-google-link"
        href="https://chat.google.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir Google Chat ↗
      </a>
    </aside>
  );
}

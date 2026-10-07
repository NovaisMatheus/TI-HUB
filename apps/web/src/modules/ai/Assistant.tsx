import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, ArrowUp, FileText } from 'lucide-react';
import { Button } from '@hub/ui';
import type { AIAnswer, Source } from '@hub/types';
import { api, send } from '../../services/api';
import { entities, display, type Entity } from '../../types';
import { PageHeader } from '../../components/PageHeader';
const sourceLabels = {
  official: 'Procedimento oficial',
  recommendation: 'Recomendação da equipe',
  case: 'Caso anterior',
  document: 'Informação documental',
};
export function Assistant() {
  const [params] = useSearchParams();
  const [question, setQuestion] = useState(params.get('q') ?? '');
  const [conversationId, setConversationId] = useState<string>();
  const [answer, setAnswer] = useState<AIAnswer>();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api<Entity[]>('ai/conversations'),
  });
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await send<AIAnswer & { conversationId: string }>('ai/ask', {
        question,
        conversationId,
      });
      setAnswer(result);
      setConversationId(result.conversationId);
      await client.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível consultar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="INTELIGÊNCIA CONTEXTUAL"
        title="Assistente TI"
        description="A IA organiza, encontra e sugere. Você verifica e decide."
        actions={<span className="knowledge-source">Provider mock</span>}
      />
      <div className="assistant-layout">
        <aside className="conversation-panel">
          <Button
            variant="outline"
            onClick={() => {
              setConversationId(undefined);
              setAnswer(undefined);
              setQuestion('');
            }}
          >
            Nova pesquisa
          </Button>
          <h3>Suas conversas</h3>
          {conversations.isError && <p className="error">Erro ao carregar conversas.</p>}
          {conversations.data?.map((row) => (
            <div key={row.id}>
              <button
                onClick={() => {
                  setConversationId(row.id);
                  const messages = entities(row.aIMessage_conversation);
                  const last = messages.filter((m) => m.role === 'assistant').at(-1);
                  if (last)
                    setAnswer({
                      answer: display(last.content),
                      sources: (last.sources ?? []) as Source[],
                      provider: 'MockAIProvider',
                      disclaimer: 'Recuperação mock com registros autorizados.',
                    });
                }}
              >
                {display(row.title)}
              </button>
              <button
                className="archive-conversation"
                aria-label="Arquivar conversa"
                onClick={async () => {
                  try {
                    await send(`ai/conversations/${row.id}`, { archived: true }, 'PATCH');
                    await client.invalidateQueries();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Falha.');
                  }
                }}
              >
                Arquivar
              </button>
            </div>
          ))}
        </aside>
        <section className="assistant-main">
          {!answer ? (
            <div className="assistant-welcome">
              <span className="assistant-icon">
                <Sparkles size={27} />
              </span>
              <h2>
                O conhecimento da equipe,
                <br />
                ao alcance de uma pergunta.
              </h2>
              <p>Pesquise casos, procedimentos e evidências de aquisição.</p>
              <div className="suggestions">
                {[
                  'Qual computador do Financeiro teve falha de SSD?',
                  'Encontre a análise com velocidade de gravação pendente.',
                  'Empenho 13232',
                  'Diagnóstico de SSD',
                ].map((q) => (
                  <button key={q} onClick={() => setQuestion(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="assistant-answer">
              <span className="knowledge-source">Resultado da recuperação · mock</span>
              <p>{answer.answer}</p>
              <h3>Fontes utilizadas</h3>
              <div className="answer-sources">
                {answer.sources.map((source) => (
                  <Link key={source.href} to={source.href}>
                    <FileText size={18} />
                    <div>
                      <small>{sourceLabels[source.kind]}</small>
                      <strong>{source.title}</strong>
                    </div>
                  </Link>
                ))}
              </div>
              <small>{answer.disclaimer}</small>
            </div>
          )}
          <form className="assistant-composer" onSubmit={ask}>
            <textarea
              aria-label="Pergunta ao assistente"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Pergunte sobre um equipamento, ocorrência ou processo…"
              required
              minLength={3}
            />
            <Button aria-label="Pesquisar" disabled={busy}>
              <ArrowUp size={18} />
            </Button>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <p className="assistant-note">
            Fontes limitadas aos registros autorizados. Nenhuma ação técnica é executada pela IA.
          </p>
        </section>
      </div>
    </>
  );
}

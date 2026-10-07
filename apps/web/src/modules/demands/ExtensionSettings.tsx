import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@hub/ui';
import { api, send } from '../../services/api';
import { display, type Entity } from '../../types';
export function ExtensionSettings() {
  const client = useQueryClient();
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const keys = useQuery({
    queryKey: ['extension-keys'],
    queryFn: () => api<Entity[]>('extension/credentials'),
  });
  return (
    <section className="detail-section">
      <h2>Extensão Chrome · Coletor 1Doc</h2>
      <a
        className="button button-outline"
        href="/downloads/ugb-ti-hub-1doc.zip"
        download="ugb-ti-hub-1doc.zip"
      >
        Baixar extensão Chrome
      </a>
      <p>
        Extraia o ZIP, abra <code>chrome://extensions</code>, ative o Modo do desenvolvedor e clique
        em Carregar sem compactação. Selecione a pasta extraída.
      </p>
      <p>
        Endereço para configurar na extensão: <strong>{window.location.origin}</strong>
      </p>
      <p>
        Na extensão, informe o endereço deste Hub e uma chave gerada abaixo. A chave vale por 30
        dias e permite verificar a conexão, localizar o documento e salvar ou atualizar demandas.
      </p>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setToken('');
          try {
            const result = await send<{ token: string }>('extension/credentials', {});
            setToken(result.token);
            await client.invalidateQueries({ queryKey: ['extension-keys'] });
            setMessage('Copie a chave para a extensão. Ela é exibida somente agora.');
          } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Falha.');
          } finally {
            setBusy(false);
          }
        }}
      >
        Gerar chave para extensão
      </Button>
      {token && (
        <label className="extension-key">
          Chave da extensão
          <input
            readOnly
            value={token}
            aria-label="Chave da extensão"
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
      <p role="status">{message}</p>
      {keys.isError && <p role="alert">Não foi possível carregar as chaves.</p>}
      {keys.data?.map((key) => (
        <div className="extension-key-row" key={key.id}>
          <span>
            Criada em {display(key.createdAt)} · expira em {display(key.expiresAt)}
          </span>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await send(`extension/credentials/${key.id}`, undefined, 'DELETE');
                setToken('');
                await client.invalidateQueries({ queryKey: ['extension-keys'] });
                setMessage('Chave revogada.');
              } catch (e) {
                setMessage(e instanceof Error ? e.message : 'Falha.');
              }
            }}
          >
            Revogar
          </Button>
        </div>
      ))}
    </section>
  );
}

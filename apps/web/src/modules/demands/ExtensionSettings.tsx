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
      <p>
        Na extensão, informe o endereço deste Hub e uma chave gerada abaixo. A chave vale por 30
        dias e permite somente verificar a conexão e importar demandas.
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

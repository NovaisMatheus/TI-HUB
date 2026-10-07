import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Network } from 'lucide-react';
import { Button } from '@hub/ui';
import type { SessionUser } from '@hub/types';
import { send } from '../../services/api';
const schema = z.object({
  email: z.string().email('Informe um email válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});
export function Login({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@hub.local' },
  });
  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="brand-mark">
          <Network size={25} />
          <strong>
            UGB <span>TI Hub</span>
          </strong>
        </div>
        <div>
          <span className="eyebrow">WORKSPACE INSTITUCIONAL</span>
          <h1>
            Tecnologia conectada.
            <br />
            <em>
              Conhecimento
              <br />
              preservado.
            </em>
          </h1>
          <p>
            Operações, evidências e experiência técnica.
            <br />
            Um ponto de encontro para a equipe de TI.
          </p>
        </div>
        <footer>UGB-TI · Prefeitura Municipal</footer>
        <div className="login-lines" aria-hidden="true" />
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">BEM-VINDO AO HUB</span>
          <h2>Acesse seu workspace</h2>
          <p>Entre com sua conta para continuar.</p>
          <form
            onSubmit={handleSubmit(async (values) => {
              setError('');
              try {
                onLogin(await send<SessionUser>('auth/login', values));
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Falha ao entrar.');
              }
            })}
          >
            <label>
              Email institucional
              <input type="email" autoComplete="username" {...register('email')} />
              <small className="error">{errors.email?.message}</small>
            </label>
            <label>
              Senha
              <input type="password" autoComplete="current-password" {...register('password')} />
              <small className="error">{errors.password?.message}</small>
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <Button disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar no Hub'} <ArrowRight size={17} />
            </Button>
          </form>
          <div className="login-info">
            Ambiente local · autenticação de desenvolvimento
            <br />A senha é definida em SEED_PASSWORD no arquivo .env.
          </div>
        </div>
      </section>
    </div>
  );
}

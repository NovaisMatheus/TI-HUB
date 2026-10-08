import { Component, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="detail-section" role="alert">
          <h2>Não foi possível abrir esta tela</h2>
          <p>
            Atualize a página para carregar a versão atual do Hub. Seus registros salvos permanecem
            no sistema.
          </p>
          <button className="button button-primary" onClick={() => window.location.reload()}>
            Recarregar página
          </button>{' '}
          <Link to="/">Voltar ao início</Link>
        </section>
      );
    return this.props.children;
  }
}
export function RouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <Boundary key={location.pathname}>{children}</Boundary>;
}

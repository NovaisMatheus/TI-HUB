import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageHeader, State } from '../PageHeader';
import { Button, Badge } from '@hub/ui';
describe('Componentes operacionais', () => {
  it('apresenta erros como alertas e loading como status acessível', () => {
    expect(renderToStaticMarkup(<State error message="API indisponível" />)).toContain(
      'role="alert"',
    );
    expect(renderToStaticMarkup(<State message="Carregando" />)).toContain('role="status"');
  });
  it('mantém título semântico e ação identificável no cabeçalho', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Equipamentos"
        actions={<Button aria-label="Cadastrar equipamento">Novo</Button>}
      />,
    );
    expect(html).toContain('<h1>Equipamentos</h1>');
    expect(html).toContain('aria-label="Cadastrar equipamento"');
  });
  it('resultados técnicos permanecem legíveis sem depender só de cor', () => {
    expect(renderToStaticMarkup(<Badge value="DIVERGENCIA" />)).toContain('divergencia');
    expect(renderToStaticMarkup(<Badge value="PENDENTE" />)).toContain('pendente');
  });
});

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';
import { oneDocImportSchema, type OneDocImport } from '../apps/api/src/demands/import.schema';
const fixture = readFileSync('tests/fixtures/one-doc.html', 'utf8');
const script = readFileSync('extensions/chrome-1doc/collector.js', 'utf8');
function collect(
  html = fixture,
  href = 'https://tenant.1doc.com.br/?pg=doc/ver&hash=doc-example&token=secret',
) {
  const context = {
    document: new DOMParser().parseFromString(html, 'text/html'),
    location: { href },
    URL,
    Date,
  };
  runInNewContext(script, context);
  return (context as typeof context & { ugbCollectOneDoc: () => OneDocImport }).ugbCollectOneDoc();
}
describe('Coletor Chrome 1Doc', () => {
  it('extrai tipo do cabeçalho, solicitante, campos e cada despacho sem duplicar a tabela', () => {
    const result = collect();
    expect(oneDocImportSchema.safeParse(result).success).toBe(true);
    expect(result.documentType).toBe('Chamado técnico');
    expect(result.number).toBe('2.852/2026');
    expect(result.sourceId).toBe('1042256');
    expect(result.requester).toBe('Pessoa Solicitante');
    expect(result.sourceStatus).toBe('Em resolução');
    expect(result.fields.map((f) => f.value)).toContain('Liberação de módulo');
    expect(result.dispatches).toHaveLength(2);
    expect(result.dispatches[0].author).toBe('Técnico Exemplo');
    expect(result.dispatches[0].dateLabel).toBe('Em 07/10/2026 11:15:50');
    expect(result.dispatches[0].mentions).toEqual(['Pessoa Responsável']);
    expect(result.dispatches[1].content).toContain('Autorizado');
  });
  it('preserva circular sem inferir o tipo pelo conteúdo ou pelo menu', () => {
    expect(collect(fixture.replaceAll('Chamado técnico', 'Circular')).documentType).toBe(
      'Circular',
    );
  });
  it('preserva Memorando quando a demanda é classificada como aquisição', () => {
    const payload = collect(fixture.replaceAll('Chamado técnico', 'Memorando'));
    expect(oneDocImportSchema.parse({ ...payload, kind: 'AQUISICAO' }).documentType).toBe(
      'Memorando',
    );
  });
  it('mantém links/imagens e não coleta tokens, scripts, inputs ou rascunhos', () => {
    const result = collect();
    expect(result.attachments).toHaveLength(3);
    expect(result.dispatches[0].attachments[0].url).toBe(
      'https://tenant.1doc.com.br/evidencia.pdf',
    );
    expect(JSON.stringify(result)).not.toMatch(/secret|do-not-collect|Rascunho não enviado/);
  });
  it('avisa quando o despacho está carregado apenas com cabeçalho', () => {
    const result = collect(fixture.replace('<p>Autorizado. Prossiga com o atendimento.</p>', ''));
    expect(result.warnings.some((w) => w.includes('conteúdo não carregado'))).toBe(true);
  });
  it('recusa listagem, outro domínio e links executáveis na API', () => {
    expect(() => collect('<html><body>Listagem</body></html>')).toThrow(
      'Documento não reconhecido',
    );
    expect(() => collect(fixture, 'https://example.invalid')).toThrow('1Doc');
    const payload = collect();
    payload.attachments[0].url = 'javascript:alert(1)';
    expect(oneDocImportSchema.safeParse(payload).success).toBe(false);
  });
});

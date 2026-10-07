import { describe, expect, it } from 'vitest';
import { canConclude, resultSchema } from '../apps/api/src/common/validation';
import { catalog, resourceSchema } from '../apps/api/src/resources/catalog';
import { SecretVault } from '../apps/api/src/integrations/secret-vault';
import { MockAIProvider, MockRemoteAccessProvider } from '../apps/api/src/integrations/providers';
import { display } from '../apps/web/src/types';
import { canAccess } from '../apps/api/src/resources/access';
describe('Conclusão técnica manual', () => {
  it('bloqueia conclusão atende com pendências, divergências ou análise vazia', () => {
    expect(canConclude(['ATENDE', 'PENDENTE'], 'ATENDE')).toBe(false);
    expect(canConclude(['DIVERGENCIA'], 'ATENDE')).toBe(false);
    expect(canConclude([], 'ATENDE')).toBe(false);
    expect(canConclude(['ATENDE'], 'ATENDE')).toBe(true);
  });
  it('aceita resultados técnicos, rejeita decisões administrativas', () => {
    expect(resultSchema.safeParse('APROVAR_FORNECEDOR').success).toBe(false);
    expect(resultSchema.safeParse('PENDENTE').success).toBe(true);
  });
});
describe('Validação do contrato', () => {
  it('aplica dependências de autorização às relações e à escrita', () => {
    const user = {
      id: '1',
      name: 'Leitor',
      email: 'test@example.invalid',
      permissions: ['analysis.read'],
    };
    expect(canAccess('analyses', user)).toBe(false);
    user.permissions.push('acquisition.read');
    expect(canAccess('analyses', user)).toBe(true);
    expect(canAccess('analyses', user, true)).toBe(false);
  });
  it('rejeita campos inesperados e IP inválido', () => {
    const schema = resourceSchema(catalog.equipment, true);
    expect(schema.safeParse({ password: 'secret' }).success).toBe(false);
    expect(schema.safeParse({ ip: '999.1.1.1' }).success).toBe(false);
    expect(schema.safeParse({ ip: '192.168.10.50' }).success).toBe(true);
  });
  it('rejeita javascript em referências documentais', () => {
    expect(
      resourceSchema(catalog.documents, true).safeParse({ url: 'javascript:alert(1)' }).success,
    ).toBe(false);
  });
  it('rejeita quantidade fracionária', () => {
    expect(resourceSchema(catalog.requests, true).safeParse({ quantity: 1.5 }).success).toBe(false);
  });
});
describe('Providers seguros', () => {
  it('preserva as fontes e informa modo mock', async () => {
    const source = {
      id: '1',
      title: 'POP-001',
      href: '/knowledge/1',
      kind: 'official' as const,
      excerpt: 'Verificar SMART.',
    };
    const answer = await new MockAIProvider().chat('SSD', [source]);
    expect(answer.sources).toEqual([source]);
    expect(answer.disclaimer).toContain('mock');
  });
  it('launcher informa que nenhum comando foi executado', async () => {
    expect((await new MockRemoteAccessProvider().launch('rdp', 'PC-01')).message).toContain(
      'Nenhum comando',
    );
  });
});
describe('Secret vault e apresentação', () => {
  it('usa envelopes aleatórios autenticados e detecta adulteração', () => {
    const vault = new SecretVault(Buffer.alloc(32, 1));
    const encrypted = vault.encrypt('example-secret');
    expect(encrypted).not.toContain('example-secret');
    expect(vault.decrypt(encrypted)).toBe('example-secret');
    expect(encrypted).not.toBe(vault.encrypt('example-secret'));
    const parts = encrypted.split('.');
    parts[1] = Buffer.alloc(16).toString('base64');
    expect(() => vault.decrypt(parts.join('.'))).toThrow();
  });
  it('mostra relações e datas sem serializar objetos na interface', () => {
    expect(display({ hostname: 'PC-01' })).toBe('PC-01');
    expect(display(null)).toBe('—');
    expect(display('2026-10-07T12:00:00.000Z')).toContain('2026');
  });
});

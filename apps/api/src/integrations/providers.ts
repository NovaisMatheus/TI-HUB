import type { AIAnswer, Source } from '@hub/types';
export interface AIProvider {
  chat(question: string, sources: Source[]): Promise<AIAnswer>;
  summarize(sources: Source[]): Promise<AIAnswer>;
  analyze(sources: Source[]): Promise<AIAnswer>;
  embeddings(texts: string[]): Promise<number[][]>;
}
export class MockAIProvider implements AIProvider {
  async chat(_question: string, sources: Source[]): Promise<AIAnswer> {
    return {
      provider: 'MockAIProvider',
      answer: sources.length
        ? `Localizei ${sources.length} registro(s) relacionado(s).\n\n${sources.map((s) => `${s.title}: ${s.excerpt}`).join('\n\n')}\n\nRevise as evidências e confirme a aplicabilidade antes de agir.`
        : 'Não encontrei evidências autorizadas para esta pergunta. Tente termos como SSD, Financeiro, patrimônio ou número do empenho.',
      sources,
      disclaimer:
        'Modo mock: recuperação de registros, sem modelo generativo. O técnico verifica e decide.',
    };
  }
  summarize(sources: Source[]) {
    return this.chat('resumo', sources);
  }
  analyze(sources: Source[]) {
    return this.chat('análise', sources);
  }
  async embeddings(_texts: string[]): Promise<number[][]> {
    throw new Error('Embeddings não configurados.');
  }
}
export class AIProviderRegistry {
  get(provider: string): AIProvider {
    if (provider !== 'mock') throw new Error('Provider não configurado.');
    return new MockAIProvider();
  }
}
export interface InventoryProvider {
  getEquipment(externalId: string): Promise<{ source: string; externalId: string; mode: string }>;
}
export class MockGLPIProvider implements InventoryProvider {
  async getEquipment(externalId: string) {
    return { source: 'GLPI', externalId, mode: 'MOCK — não sincroniza inventário real' };
  }
}
export interface DocumentProvider {
  search(query: string): Promise<{ title: string; url: string }[]>;
}
export class MockGoogleDriveProvider implements DocumentProvider {
  async search(_query: string) {
    return [];
  }
}
export interface RemoteAccessService {
  launch(
    protocol: 'rdp' | 'vnc' | 'smb',
    hostname: string,
  ): Promise<{ mode: string; message: string }>;
}
export class MockRemoteAccessProvider implements RemoteAccessService {
  async launch(protocol: 'rdp' | 'vnc' | 'smb', hostname: string) {
    return {
      mode: 'MOCK',
      message: `Launcher local ainda não configurado. Solicitação ${protocol.toUpperCase()} para ${hostname}. Nenhum comando foi executado.`,
    };
  }
}
export interface EmbeddingIndex {
  index(entityType: string, entityId: string, text: string): Promise<void>;
  search(query: string, permissions: string[]): Promise<Source[]>;
}
export interface IdentityProvider {
  authenticate(login: string, password: string): Promise<{ externalId: string }>;
}

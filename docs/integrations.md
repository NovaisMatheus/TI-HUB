# Integrações

Interfaces em `apps/api/src/integrations/providers.ts`:

| Contrato            | Implementação inicial    | Evolução                                             |
| ------------------- | ------------------------ | ---------------------------------------------------- |
| InventoryProvider   | MockGLPIProvider         | GLPI com autenticação, paginação e origem preservada |
| DocumentProvider    | MockGoogleDriveProvider  | OAuth Drive/Docs e referência por externalId         |
| RemoteAccessService | MockRemoteAccessProvider | agente local com allowlist RDP/VNC/SMB               |
| AIProvider          | MockAIProvider           | Gemini/OpenAI/institucional                          |
| EmbeddingIndex      | interface                | pgvector e indexação autorizada                      |
| IdentityProvider    | interface                | LDAP/AD/SSO                                          |

Providers mock vivem no backend. A interface informa o modo e não simula sucesso de operações externas. MockAIProvider recupera registros reais do banco de desenvolvimento e apresenta suas fontes; não chama um LLM nem produz diagnóstico autônomo.

Fluxo futuro de RAG: pergunta → registros candidatos → autorização e política de dados → ranking → contexto limitado → provider → resposta com fontes. Embeddings também devem respeitar autorização e classificação antes da indexação e recuperação. NO_AI nunca entra no contexto; INSTITUTIONAL_ONLY não pode ser enviado a provider externo.

AIConfiguration e IntegrationConfiguration têm campo encryptedCredential, reservado para envelopes AES-256-GCM gerados no backend pelo SecretVault. A chave mestra deve vir de secret manager/env em produção e ser rotacionada; não existe endpoint de credencial ativa nesta versão. Nunca retornar o valor de uma chave à SPA.

O PostgreSQL do Compose usa imagem com pgvector. A ativação da extensão e uma migration para embeddings só devem ser adicionadas quando o provider e as políticas de indexação estiverem homologados. A alternativa PostgreSQL local não inclui essa extensão.

# Arquitetura

Monorepo pnpm com SPA React e API NestJS independentes. PostgreSQL é a única fonte principal de registros. localStorage guarda somente a preferência de tema. Comunicação por JSON com contratos compartilhados; TanStack Query gerencia cache e invalidação após escritas.

O catálogo de recursos declara campos, colunas e permission keys. A API gera validação Zod estrita a partir desse contrato. ResourceService trata paginação, autorização e persistência; RecordHooks trata relações e invariantes de gravação, e WorkflowService trata avaliações e conclusões técnicas. Não há delegates ou nomes de modelo vindos diretamente do usuário: somente recursos registrados no catálogo podem ser acessados.

Escrita e auditoria acontecem na mesma transação. Falhas desfazem a escrita. Avaliações técnicas e conclusão manual têm endpoints próprios. Versões de POP e descritivo são append-only. A constraint composta impede duplicação da versão; numa corrida de criação, o usuário recebe conflito e pode repetir a ação.

O guard verifica a identidade no banco em cada requisição e resolve permission keys a partir de UserRole e RolePermission. Novos providers de identidade podem implementar IdentityProvider; a sessão HTTP pode permanecer independente de LDAP/SSO.

Busca lexical atual usa queries parametrizadas Prisma e ranking por termos em título e conteúdo. Providers de IA recebem no máximo seis fontes autorizadas. NO_AI é excluído do contexto. As políticas de IA externa estão modeladas, porém nenhum provider externo está ativo.

Leitura de manutenção exige também equipment.read. Análises e conferências exigem acquisition.read para suas relações. Documentos são filtrados pelo módulo vinculado. A mesma política é usada na busca e no assistente; fontes históricas de conversas são revalidadas antes de exibição.

Evolução: separar catálogo em módulos conforme crescer; adicionar autorização por unidade/registros caso seja necessária, busca full-text indexada, outbox para integrações, upload com armazenamento isolado, health/readiness checks e testes E2E em CI. O catálogo não substitui workflows específicos quando existirem regras de negócio próprias.

## Operação

Desenvolvimento: Vite 5173 → NestJS 3001 → PostgreSQL 5432. Docker: Nginx → API → banco com healthcheck. Somente o API container conhece DATABASE_URL/JWT_SECRET. Nenhum secret é compilado no frontend. O backend usa módulos CommonJS compilados pelo TypeScript, garantindo os metadados necessários à injeção do NestJS.

Não há tarefas agendadas, sondagem ICMP nem processos automáticos de aquisição. O status de equipamento é manual e independente da conectividade.

# UGB TI Hub

Workspace técnico interno para centralizar equipamentos, intervenções, conhecimento e a cadeia técnica de aquisições de uma prefeitura. Primeira fundação executável, com frontend e API separados, persistência PostgreSQL, permissões e trilha de auditoria. Os dados iniciais são fictícios.

A [extensão Chrome para 1Doc](docs/chrome-1doc.md) coleta documentos e despachos ao clicar em Coletar, criando ou atualizando registros no módulo Demandas. Instalação e conexão estão descritas no guia.

## Execução local

Requisitos: Node.js 24, pnpm 11.19 e PostgreSQL 17/18 ou Docker Compose. A versão de pnpm está fixada em `package.json`. Instale com `corepack enable` ou use uma instalação compatível de pnpm.

```powershell
pnpm install
pnpm setup:local
# Gera .env com JWT_SECRET e SEED_PASSWORD aleatórios.
# Revise DATABASE_URL e CORS_ORIGIN para seu ambiente.
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Sem Docker, execute `pnpm db:local` em um terminal e mantenha-o aberto. É PostgreSQL real, restrito ao loopback, com dados persistidos em `.local/postgres`. Use a mesma `DATABASE_URL` de `.env.example`. Esta alternativa é apenas para desenvolvimento.

Abra [http://localhost:5173](http://localhost:5173). A API fica em `http://localhost:3001/api`. O Vite encaminha `/api` para o NestJS; o navegador não acessa o banco.

| Conta fictícia       | Perfil          |
| -------------------- | --------------- |
| `admin@hub.local`    | Administrador   |
| `tecnico@hub.local`  | Técnico         |
| `consulta@hub.local` | Somente leitura |

A senha das três contas é o valor de `SEED_PASSWORD` definido no primeiro seed. Reexecutar o seed preserva senhas e registros existentes; não reseta o banco. Não usar essas contas em produção. Neste workspace, `.env` já foi gerado com valores locais aleatórios e o seed foi aplicado.

## Aplicação inteira em Docker

Com `.env` configurado e dependências instaladas:

```powershell
docker compose up -d --build
docker compose exec api pnpm db:seed
```

O container da API aplica migrations antes de iniciar. O seed é explícito. Os serviços são expostos apenas no loopback; PostgreSQL possui volume persistente. O frontend é servido por Nginx com fallback de rotas e proxy da API. O Compose não é uma configuração completa de produção.

## Fluxos disponíveis

- Autenticação local com bcrypt e cookie de sessão HttpOnly, RBAC por permission keys, tema claro/escuro/sistema e menu recolhível.
- Dashboard alimentado pelo banco; pesquisa global com Ctrl+K, incluindo IP, patrimônio, setores, procedimentos e número de empenho.
- Equipamentos: cadastro/edição, hardware, rede, status manual, intervenções e histórico próprio.
- Conhecimento: cadastro de POP e nova versão imutável do conteúdo; recomendações vinculadas a casos, conversão de intervenção em formulário revisável, feedback, soluções conhecidas e biblioteca de scripts para consulta.
- Aquisições: descritivo e versões com requisitos estruturados → requisição com item → processo → proposta com produto → análise por requisito → conclusão manual → empenho → conferência de entrega → timeline por processo e fornecedor.
- Fornecedores e suas participações, referências documentais por URL/Drive/Docs, catálogo de sistemas e ferramentas.
- Assistente mock com fontes reais autorizadas do banco, conversas pessoais, arquivamento e preferência de ativação.
- Auditoria antes/depois, registro de feedback e avaliações; logs HTTP estruturados sem corpos, senhas ou tokens.

Para criar um descritivo, escreva um requisito por linha:

```text
Memória RAM | Capacidade | >= | 16 | GB | capacidade
Interfaces | Portas USB 3.x | >= | 4 | portas | quantidade
Armazenamento | Velocidade de gravação | >= | 1500 | MB/s | velocidade
```

Ao registrar proposta, selecione um item da requisição do processo. Ao registrar análise, use a versão do descritivo vinculada àquele item. Empenho, produto, fornecedor e requisição também precisam corresponder. A API rejeita vínculos inconsistentes. Requisições com processo, propostas já analisadas e empenhos já conferidos não podem ser editados retroativamente.

## Stack e estrutura

React 19, TypeScript strict, Vite, Tailwind 4, componentes no padrão shadcn com Radix/CVA, Lucide, React Router, TanStack Query, React Hook Form e Zod. NestJS 11.2.7, Prisma 6.19.3 e PostgreSQL. Versões fixadas no lockfile para reprodutibilidade.

```text
apps/web       frontend por módulos e componentes reutilizáveis
apps/api       autenticação, recursos, workflows, pesquisa e adapters
packages/ui    componentes compartilhados (Button, Dialog, Badge)
packages/types contratos comuns
packages/config configuração TypeScript
docs           arquitetura, domínio, integrações e segurança
tests          testes de domínio, validação, providers e criptografia
scripts        PostgreSQL local, banco e smoke test HTTP
```

## Verificação

```powershell
pnpm typecheck
pnpm lint
pnpm build
pnpm test
# Com API e banco iniciados:
pnpm test:smoke
pnpm test:chain
pnpm test:interface
pnpm test:1doc
```

Os smoke tests criam registros fictícios, versões e eventos de auditoria no banco de desenvolvimento. O teste de cadeia cria um processo completo. Execute apenas em uma base descartável de desenvolvimento. Testes unitários não dependem do banco.

Migrations são SQL versionado em `apps/api/prisma/migrations`. Após mudar o schema em desenvolvimento, gere uma nova migration com o Prisma e revise o SQL; não altere migrations já aplicadas. `pnpm db:migrate` utiliza [Prisma migrate deploy](https://docs.prisma.io/docs/cli/migrate/deploy).

## Limites desta iteração

GLPI, Drive/Docs, acesso remoto e IA generativa permanecem em modo mock. Os links do seed usam `example.invalid` deliberadamente. O assistente faz busca textual com ranking lexical; não há embeddings, pgvector ativo, OCR ou RAG externo. O container PostgreSQL está preparado para ativar pgvector futuramente.

O teste ICMP real é desativado por padrão. Pode ser habilitado com `ENABLE_CONNECTION_TEST=true` no backend e executado somente pelo botão do equipamento. É restrito a IPv4 privado cadastrado, um pacote por solicitação, timeout curto, sem shell e sem alteração de status. Containers precisam fornecer o utilitário `ping` e a permissão de rede adequada. RDP/VNC/SMB nunca são executados pelo navegador.

Esta iteração cadastra um item por formulário de requisição, proposta e empenho; o modelo suporta múltiplos itens para evolução da UX. Documentos são referências externas; upload binário, fotos e anexos locais ainda não possuem armazenamento. Contatos de fornecedores existem no modelo e seed, mas não têm editor separado. Revisão de POP, gestão de usuários/roles pela interface, favoritos por usuário, renomeação/exclusão de conversas e providers externos são evoluções pendentes. O vault AES-GCM é uma base de integração, sem endpoints de credenciais nesta versão.

Veja [arquitetura](docs/architecture.md), [domínio](docs/domain.md), [integrações](docs/integrations.md) e [segurança](docs/security.md). Antes de produção, concluir hardening, gestão de identidades, backups, TLS, observabilidade centralizada, revisão de segurança e homologação com os técnicos.

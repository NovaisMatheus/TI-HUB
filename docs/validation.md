# Validação da primeira iteração

Executada em 7 de outubro de 2026, Windows, Node 24.21, pnpm 11.19 e PostgreSQL local real.

| Verificação                               | Resultado                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalação com lockfile                   | OK                                                                                                                                                      |
| Prisma generate, migration inicial e seed | OK                                                                                                                                                      |
| Prisma migrate status                     | Banco atualizado                                                                                                                                        |
| TypeScript strict (API, seed e frontend)  | OK                                                                                                                                                      |
| ESLint                                    | OK                                                                                                                                                      |
| Build API e frontend                      | OK                                                                                                                                                      |
| Vitest                                    | 13 testes, todos aprovados                                                                                                                              |
| Smoke HTTP                                | Auth, consulta sem escrita, busca IP/empenho, manutenção, versões de POP, conclusão manual, conferência, timeline, IA e auditoria                       |
| Teste de cadeia criada do zero            | Fornecedor → descritivo → requisição → processo → proposta → análise → empenho → conferência → timeline                                                 |
| Preservação de versão                     | Análise utiliza v1 mesmo após criação de v2 do descritivo                                                                                               |
| Navegador                                 | Login, inventário, cadastro com hardware/rede, intervenção contextual, formulário de recomendação preenchido pelo caso, tema e Ctrl+K com empenho 13232 |
| pnpm audit --prod                         | Nenhuma vulnerabilidade conhecida na execução final                                                                                                     |

O teste de cadeia e o smoke criaram dados fictícios adicionais na base local; o seed original permanece reproduzível para novas instalações. Docker Compose não foi executado porque Docker não está instalado neste host. Providers externos, ICMP habilitado, LDAP/SSO, importações e RAG generativo não foram testados. A CI foi configurada, mas não executada remotamente nesta entrega.

NestJS, Express, React Router, Prisma e rate limiting foram atualizados após revisão de advisories. O override scoped `@prisma/config>deepmerge-ts` fixa 8.0.2 para remover um advisory transitivo de ferramenta de configuração; geração, migrations e os fluxos foram revalidados após a atualização.

## Revisão de pesquisa e tema

Na revisão de 7 de outubro, a pesquisa passou a ter campo visível no cabeçalho, com abertura por Enter, botão e Ctrl+K. O texto é compartilhado com a janela de resultados, que distingue espera, consulta curta, ausência de resultados e erro. Os filtros dos módulos também passaram a pesquisar o título/identificador exibido.

O tema usa botões Claro/Escuro/Sistema, aplica a seleção imediatamente, acompanha mudanças do sistema, mantém cache por usuário e serializa gravações no perfil. A sessão em cache é atualizada após o salvamento. Se a API falhar, a seleção local permanece e a interface informa a falha.

- Vitest: 18 testes aprovados, incluindo interação em DOM simulado para busca, foco, Ctrl+K, Escape, resultados/erros, temas, persistência local, isolamento por usuário e gravações rápidas/falhas.
- `pnpm test:interface`: 17 listagens e 17 detalhes, paginação, filtros pelo título, dashboard, busca IP/hostname/empenho, persistência dos três temas na API, bloqueio de escrita por consulta e isolamento/arquivamento de conversas.
- `pnpm test:chain` e `pnpm test:smoke`: aprovados novamente com PostgreSQL real e fixtures fictícias.
- TypeScript, ESLint, build e auditoria de dependências de produção: aprovados.

A ferramenta de navegador rejeitou a navegação nesta revisão por política automática. Assim, a verificação visual anterior não confirma o layout alterado; os novos controles foram verificados por código, DOM simulado e HTTP, sem contornar o bloqueio. Providers externos e funções futuras indicadas no README continuam fora desta validação.

## Demandas e extensão Chrome 1Doc

- Migration aplicada ao PostgreSQL local e Prisma Client regenerado. Banco atualizado; roles Administrador/Técnico recebem escrita e Consulta somente leitura.
- HTML anexado analisado sem executar scripts: Chamado técnico 2.852/2026, assunto NovoServ - Usuários, dois campos adicionais e um despacho. Não foi importado no banco; testes usam fixture anonimizada.
- Vitest: 27 testes aprovados, incluindo extração de múltiplos despachos, Circular/Chamado técnico, metadados, campos, anexos, limpeza de tokens/rascunhos, conteúdo parcial, validação de links, service worker com API Chrome simulada e exibição/edição de demanda em DOM simulado.
- `pnpm test:1doc`: importação acima de 100 KB, criação, atualização sem duplicação, retenção de despachos/conteúdo/anexos em captura parcial, observações internas, busca por conteúdo de despacho, bloqueio de consulta, chave restrita a endpoints de extensão e revogação, com API e PostgreSQL reais.
- `pnpm test:interface`: 18 módulos listados, detalhados e filtrados; `pnpm test:chain`: cadeia de aquisição aprovada novamente.
- TypeScript, ESLint, build e auditoria de produção aprovados.

O Chrome instalado e uma sessão autenticada real do 1Doc não foram controlados ou testados nesta etapa. A extensão é entregue para instalação local, sem publicação na Web Store. O coletor suporta a estrutura interna do exemplo; conteúdo não carregado e outros layouts precisam de validação em uso real. A captura de anexos preserva links/metadados, não os arquivos binários.

## Chat lateral e extensão 1.1

- Chat à direita com conversa persistente da equipe, paginação, atualização a cada cinco segundos, recolhimento e preservação de rascunho após erro.
- Integração Google implementada com OAuth individual, estado de uso único vinculado ao navegador, PKCE, tokens criptografados e leitura/envio nos espaços autorizados. Credenciais Google ausentes: conexão real não ativada, interface informa configuração pendente.
- Extensão 1.1 adiciona botão flutuante no 1Doc, resumo antes do envio e botões distintos Salvar/Atualizar; mesma UX no popup da barra. Memorando mantém tipo de origem e pode receber classificação Aquisição. A coleta sem classificação não sobrescreve a classificação existente.
- 36 testes automatizados aprovados: fluxo do botão flutuante em DOM simulado, remetente da extensão e recusa de iframes, classificação de Memorando, chat e retries, OAuth/criptografia com Google simulado e testes anteriores.
- `pnpm test:1doc` validou atualização, retenção de classificação Aquisição, filtro e localização pela chave. `pnpm test:chat` validou persistência de mensagem, compartilhamento entre usuários, envio idempotente, bloqueio de escrita pelo perfil Consulta e retorno OAuth inválido recusado, através do proxy do frontend.
- Quatro migrations aplicadas; TypeScript, ESLint, build e auditoria de produção aprovados.

A aparência dos novos painéis e a extensão instalada ainda não foram verificadas em navegador real, respeitando o bloqueio da ferramenta. Conta Google e chamadas externas reais também não foram verificadas; consulte `google-chat.md` para configuração.

## Gestão de usuários — 07/10/2026

38 testes automatizados aprovados; typecheck, lint e build concluídos. Teste HTTP de usuários validou cadastro, duplicidade, login por usuário/e-mail, controle de perfis, troca de senha, invalidação de sessões e desativação/reativação. Quinta migração aplicada. Contas solicitadas criadas localmente e seus logins verificados; credenciais iniciais em arquivo ignorado pelo Git. Verificação visual no navegador não realizada.

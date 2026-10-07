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

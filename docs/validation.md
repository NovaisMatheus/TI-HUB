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

# Revisão de código e preparação da base

Referência: 07/10/2026. Revisão dirigida de autenticação, RBAC, inicialização, recursos e versões, aquisições, importação 1Doc, chat, pesquisa, exposição de segredos e testes. Não constitui auditoria independente de segurança nem certificação de produção.

## Problemas corrigidos

| Problema                                                                        | Efeito anterior                                                                              | Correção                                                                                                            |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Seed condicionado apenas à existência de equipamentos                           | Após limpar equipamentos, executar seed podia repovoar a base com dados fictícios            | Seed padrão prepara perfis/permissões e o primeiro administrador; demonstração exige HUB_DEMO_DATA=true             |
| Testes HTTP gravavam fixtures sem proteção de execução                          | Comandos de validação podiam contaminar a base usada pela equipe                             | Os seis scripts que gravam dados exigem HUB_ALLOW_TEST_DATA=true, com mensagem explícita para usar base descartável |
| PATCH de documento exigia vínculo no corpo mesmo quando alterava somente título | Edição parcial falhava e o autor de criação podia ser substituído                            | Campos omitidos são recuperados do registro atual; autor original é preservado                                      |
| PATCH de proposta/empenho validava somente IDs recebidos                        | Atualizar só preço ou valor podia falhar; alterar apenas vínculos podia gerar inconsistência | Validação usa os vínculos existentes; troca de processo/fornecedor/vínculos exige novo registro                     |
| Atualização de descritivo sem conteúdo/requisitos completos                     | Requisitos isolados eram descartados; conteúdo novo sem requisitos falhava                   | Requisitos isolados são recusados explicitamente; conteúdo novo copia requisitos anteriores se omitidos             |
| Avaliação e conclusão concorrentes de análise                                   | Uma avaliação poderia modificar evidência após a outra transação concluir                    | Bloqueio da linha da análise em ambas as operações                                                                  |
| Avaliações concorrentes na conferência                                          | Resultado agregado podia refletir uma visão intermediária dos itens                          | Bloqueio da conferência antes de editar item e recalcular resultado                                                 |
| Espera padrão curta por transação                                               | Validação concorrente em banco real encontrou timeout de obtenção de transação               | PrismaService define espera de 10 segundos e duração de 15 segundos, mantendo limites finitos                       |
| Paginação da auditoria sem validação inteira/finita                             | Parâmetros fracionários, negativos ou excessivos chegavam ao Prisma                          | Página inteira entre 1 e 100.000 e consulta de até 200 caracteres, validadas com Zod                                |
| Listagem mostrava acessos fictícios desativados como conteúdo principal         | Base de uso ainda exibia os usuários de demonstração                                         | Lista exibe ativos por padrão, com opção de consultar inativos                                                      |
| URLs eram validadas somente pelo prefixo                                        | URLs incompletas ou com credenciais embutidas podiam ser cadastradas                         | Parse de URL, protocolo http/https, limite de tamanho e recusa de usuário/senha na URL                              |
| Formulário removia textos opcionais vazios do PATCH                             | Apagar observações existentes não limpava o campo no banco                                   | Edição envia texto vazio para limpar campos opcionais de texto; relações e e-mails vazios continuam omitidos        |

O diagnóstico Google corrigido na etapa anterior também foi revisado: corpo JSON com text, cabeçalhos corretos, erro original diferenciado e credenciais conhecidas ocultadas. O erro observado de envio era configuração do aplicativo Google Chat, confirmado por HTTP 404 / NOT_FOUND / Google Chat app not found. A configuração externa precisa ser homologada pelo usuário; ela não é corrigida apenas alterando o payload.

## Limpeza executada

Foi gerado um snapshot consistente de dados antes da limpeza em `.local/backups/antes-limpeza-2026-10-07T17-01-35-043Z.json`, com 49 modelos e 1.033 registros. Contém dados locais sensíveis e permanece fora do Git. O snapshot é exportação de dados Prisma, não um dump PostgreSQL completo com schema e permissões.

Foram removidos 917 registros fictícios e seus dependentes, incluindo equipamento/rede/hardware, setores de demonstração, intervenções, conhecimento, fornecedores, cadeia de aquisição, três demandas QA com seus despachos/snapshots, mensagens locais de teste, conversas mock e auditorias referentes às fixtures. A remoção ocorreu em uma transação, identificando registros do seed e dos testes conhecidos; não houve truncamento geral da base.

Preservados: dois documentos reais de taruma.1doc.com.br com seus dados, a conta principal ativa, a conexão Google, configurações reais e auditorias relacionadas ao uso real. Sete acessos fictícios foram desativados, com sessões invalidadas e credenciais de extensão revogadas; a identidade histórica foi mantida. Um evento REMOVE_DEMO_DATA registra o resumo da operação.

Contagens após a limpeza e reexecução do seed padrão: zero equipamentos, zero POPs e zero processos; duas demandas reais; uma conta ativa; uma conexão Google. A base está pronta para cadastro de dados reais. Não execute testes que gravam fixtures nessa base.

## Validação

- 47 testes automatizados aprovados, incluindo seis casos novos para edições parciais e preservação de requisitos; testes padrão não alteram PostgreSQL operacional.
- TypeScript, lint e build verificados na entrega.
- Auditoria de dependências de produção sem vulnerabilidades conhecidas reportadas; isso não elimina riscos de lógica, configuração ou vulnerabilidades ainda não publicadas.
- Em uma base PostgreSQL separada, foram verificados PATCH documental, versão de descritivo com requisitos preservados e concorrência real de avaliação/conclusão e de conferência. A primeira execução revelou o timeout de espera corrigido; a repetição com os limites novos passou.
- Seed padrão reexecutado na base limpa sem inserir registros fictícios ou reativar contas.
- Inspeção visual no navegador indisponível pela política da ferramenta; interface validada por testes DOM e compilação. A extensão precisa de homologação manual no Chrome e nos documentos 1Doc usados pela equipe.

## Pontos a acompanhar

1. Homologar envio Google após configuração do aplicativo e validar as políticas da organização.
2. Definir backup PostgreSQL recorrente, retenção e restauração ensaiada; o snapshot local desta limpeza não substitui essa operação.
3. Ampliar seleção de relações: atualmente as opções carregam até 100 registros. Bases maiores precisam de pesquisa/paginação nesses campos.
4. Completar editor de múltiplos itens e armazenamento de anexos. Evitar descrever o suporte do modelo como uma interface já disponível.
5. Ensaiar autenticação/recuperação, implantação HTTPS, quotas e permissões com a equipe antes de produção.
6. Manter GLPI, IA externa, Drive/Docs e launcher identificados como mock/pendentes até integrações reais homologadas.

Para requisitos e critérios de aceitação, consulte [a especificação](especificacao-projeto.md). Para alimentação e manutenção da base, consulte [operação](operacao.md).

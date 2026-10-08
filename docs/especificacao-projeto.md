# UGB TI Hub — Especificação funcional e técnica

Versão 1.0 · referência: 07/10/2026 · estado: aplicação local executável, em evolução para uso institucional.

Este documento serve como referência de produto, implementação, homologação e contratação de evoluções. Descreve o comportamento existente; funcionalidades futuras estão identificadas separadamente. O código, o schema Prisma e as migrations versionadas são os contratos executáveis. Mudanças de comportamento devem atualizar esta especificação e os critérios de aceitação correspondentes.

## 1. Objetivo e público

Centralizar o trabalho da equipe de Tecnologia da Informação da Prefeitura: inventário, atendimento, intervenções, conhecimento institucional e análise técnica de aquisições. Integrar sistemas existentes e preservar evidências, autoria e histórico. A equipe continua responsável pelas decisões técnicas; o Hub não aprova compras, escolhe fornecedores ou substitui o sistema administrativo de licitações e empenhos.

O expediente típico começa pela busca de equipamento, demanda ou procedimento; passa pelo registro da intervenção e consulta ao histórico; e pode resultar em conhecimento reutilizável, troca de ideias no chat ou análise de uma aquisição.

## 2. Identidade e permissões

| Perfil        | Operação                                                              | Restrições                                                                      |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Administrador | Cadastro e edição dos módulos, usuários e auditoria                   | Não pode desativar a própria conta ou remover seu próprio perfil administrativo |
| Técnico       | Cadastro e edição dos módulos, análises, conferências e envio no chat | Sem gestão de usuários e sem auditoria administrativa                           |
| Consulta      | Consulta dos módulos, histórico, pesquisa e chat                      | Sem alterações em registros e sem envio de mensagens                            |

RF-01: entrar por usuário único ou e-mail, normalizados para minúsculas. Senhas são armazenadas com bcrypt, custo 12; novas senhas têm ao menos 12 caracteres e no máximo 72 bytes.

RF-02: Administrador cadastra nome, usuário, e-mail, perfil, situação e senha inicial; pode redefinir senha e desativar/reativar contas. Contas desativadas permanecem no histórico. A listagem mostra contas ativas por padrão e permite consultar inativas.

RF-03: cada pessoa troca sua senha em Meu perfil, confirmando a senha atual. A troca invalida sessões anteriores e credenciais da extensão. Desativação impede acesso e também invalida sessões antigas após reativação. Permissões são verificadas pelo servidor a cada requisição.

Não há autocadastro, recuperação por e-mail, MFA ou login institucional SSO nesta versão. O OAuth Google Chat autoriza a integração de uma conta já autenticada no Hub; não substitui o login do Hub.

## 3. Módulos e comportamento disponível

| ID    | Módulo                 | Comportamento atual                                                                                                                                                         |
| ----- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-04 | Workspace              | Navegação por módulos, dashboard baseado no banco, menu recolhível e temas claro/escuro/sistema persistidos por usuário                                                     |
| RF-05 | Pesquisa               | Campo visível e Ctrl+K; pesquisa autorizada por texto, IP, patrimônio, setor, documentos, conteúdo de POP, descritivo, análise e despacho de demanda                        |
| RF-06 | Setores e equipamentos | Cadastro de setor, hostname, patrimônio, serial, fabricante, modelo, usuário associado, rede, hardware e situação técnica                                                   |
| RF-07 | Intervenções           | Ocorrência, diagnóstico, manutenção, instalação, configuração e outros tipos; problema, diagnóstico, procedimento, solução, componentes, técnico e histórico do equipamento |
| RF-08 | Conhecimento           | POP com conteúdo versionado; recomendações, feedback, soluções conhecidas e scripts para consulta. Alterar conteúdo cria uma nova versão                                    |
| RF-09 | Descritivos            | Versões com conteúdo e requisitos estruturados: grupo, campo, operador, valor, unidade e tipo de valor                                                                      |
| RF-10 | Aquisições             | Requisição → processo → proposta → análise técnica → empenho → conferência. Timeline e relações com fornecedor                                                              |
| RF-11 | Documentos e sistemas  | Referências externas e cópias de anexos com texto extraído e acesso controlado; catálogo de sistemas                                                                        |
| RF-12 | Demandas 1Doc          | Coleta e atualização manual pela extensão; preservação do tipo original, dados relevantes, despachos, origem e snapshots                                                    |
| RF-13 | Chat                   | Painel à direita, conversa compartilhada da equipe e integração individual com Google Chat                                                                                  |
| RF-14 | Assistente             | Recuperação textual de registros autorizados, fontes e histórico pessoal; provider mock identificado na interface                                                           |
| RF-15 | Auditoria              | Registro administrativo de alterações e avaliações, separado do histórico técnico e da timeline de aquisição                                                                |

Listagens possuem pesquisa e paginação. Os detalhes apresentam relações e histórico conforme as permissões. Ausência de registros deve aparecer como estado vazio; falhas de API devem ser visíveis, sem dados simulados como fallback.

## 4. Regras de aquisição e evidência

1. O requisito é cadastrado por linha no formato `grupo | campo | operador | valor | unidade | tipo`. Exemplo: `Memória RAM | Capacidade | >= | 16 | GB | capacidade`.
2. O item da requisição aponta para uma versão específica do descritivo. Uma versão nova não altera a evidência usada em uma análise anterior.
3. O produto da proposta deve pertencer à requisição do processo. Processo, fornecedor, requisição e produto do empenho devem corresponder à proposta.
4. Resultados técnicos são ATENDE, DIVERGENCIA ou PENDENTE. Divergência exige justificativa. A conclusão ATENDE é recusada se algum requisito não estiver ATENDE ou se não houver requisitos.
5. A conclusão é manual e impede avaliações posteriores da análise. Operações concorrentes são serializadas no registro da análise. Conferências concorrentes são serializadas antes do cálculo do resultado agregado.
6. Requisição com propostas, proposta já analisada e empenho já conferido têm edição bloqueada para preservar evidências. O fluxo de conferência do descritivo permite criar uma versão para a requisição antes de qualquer análise. Trocar processo/fornecedor de uma proposta ou vínculos de um empenho exige novo registro.
7. Na edição parcial, campos omitidos preservam o valor atual. Alterar o conteúdo de um descritivo sem informar requisitos copia os requisitos da última versão; alterar somente requisitos é recusado, exigindo o conteúdo da nova versão.

A interface atual cadastra um item por formulário de requisição, proposta e empenho. O modelo admite múltiplos itens; um editor completo de múltiplos itens é evolução pendente. Não existe cálculo automático de equivalência técnica ou aprovação administrativa.

Aquisições importadas criam requisição, descritivo e processo vinculados à demanda. A quantidade fica pendente, sem valor presumido. O processo apresenta texto da requisição, todos os despachos preservados, referências e cópias dos anexos. A extensão 1.2 copia arquivos acessíveis de até 8 MB e extrai localmente PDF, DOCX, XLSX, TXT e CSV; falhas e formatos sem texto exigem conferência ou anexo manual. A categoria é sugerida pelo nome e pode ser corrigida. A equipe confirma os requisitos e cadastra as ofertas; a análise registra links de referência por requisito. Atualizar a demanda não substitui descritivos já conferidos ou analisados. Fontes derivadas de aquisição NO_AI também ficam fora do assistente.

## 5. Extensão Chrome e demandas

A timeline dos processos combina eventos do Hub e publicações dos despachos importados. A data/hora é obtida do campo de publicação do 1Doc e interpretada no fuso America/Sao_Paulo; datas ausentes ou inválidas ficam identificadas, sem substituir pela data da coleta. A interface oferece pesquisa no conteúdo/autor, filtro por origem, ordem cronológica/reversa e expansão do texto completo, participantes, assinatura e anexos. Descrições breves usam trechos automáticos locais, sem modelo generativo; não presumem o conteúdo de anexos. A atualização da coleta mantém a identidade do despacho, sem novos eventos duplicados.

Manifest V3, com popup da extensão e botão flutuante na página HTTPS do 1Doc. O usuário configura a URL do Hub e uma credencial pessoal gerada em Meu perfil. A credencial dura 30 dias, pode ser revogada e é armazenada como hash no servidor.

Fluxo: abrir documento no 1Doc → Coletar → revisar resumo e classificação → Salvar ou Atualizar → abrir a demanda no Hub. Coletar não salva automaticamente. O botão flutuante é isolado por Shadow DOM, e o service worker aceita mensagens somente da extensão ou do frame principal de páginas 1Doc permitidas.

Campos relevantes: URL/host/identificador, número, tipo original, título, descrição, solicitante, situação de origem, metadados, campos identificados, participantes, referências de anexos e despachos encontrados no DOM. Despachos incluem identificador, ordem, título, autor, data textual, conteúdo e metadados. O coletor depende da estrutura e do conteúdo carregado na página; não garante despachos ocultos, paginados ou ainda não carregados. Após confirmar o salvamento, a extensão copia os anexos acessíveis e registra avisos para os arquivos não copiados ou sem texto extraível.

Documento e demanda são identificados pelo par host + ID de origem. Atualizações não duplicam a demanda. Despachos ausentes na nova coleta são preservados; conteúdo vazio não apaga conteúdo anterior. Situação e observações internas são mantidas. Cada coleta registra um snapshot.

A classificação do Hub é SUPORTE, AQUISICAO ou OUTRA, independente do tipo original do 1Doc. Um Memorando pode ser classificado como AQUISICAO, mantendo “Memorando” como tipo. Essa classificação cria uma requisição e um processo A_CONFERIR, com descritivo EM_REVISAO e anexos vinculados; empenhos dependem de registro pela equipe. Demandas importadas usam NO_AI por padrão.

As credenciais da extensão autorizam somente endpoints explicitamente habilitados para importação e consulta mínima de existência/classificação; não autorizam acesso geral ao Hub ou ao chat. Consulte [instalação e uso](chrome-1doc.md).

## 6. Chat e integração Google

Equipe Hub: conversa comum a usuários autorizados; mensagens persistidas no PostgreSQL, texto de até 4.000 caracteres, histórico paginado, atualização a cada cinco segundos enquanto o painel está aberto. Envios usam requestId para evitar duplicação em tentativas repetidas. Erros preservam o texto.

Google Chat: OAuth individual com estado de uso único, cookie de vínculo, PKCE e tokens AES-GCM no servidor. Escopos: chat.spaces.readonly, chat.messages.readonly e chat.messages.create. Lista espaços e mensagens e envia texto como a pessoa conectada. Mensagens Google não são replicadas no banco do Hub nem fornecidas à IA.

O mesmo projeto Google Cloud precisa ter API, OAuth e aplicativo de Chat configurados. Leitura pode funcionar antes da configuração do aplicativo; envio exige a configuração adicional. Erros exibem o status e o detalhe do Google com credenciais conhecidas ocultadas. Logs registram operação e códigos, sem conteúdo de mensagens ou tokens.

No desktop, o painel reserva espaço à direita; em telas menores, abre sobre o conteúdo. Há alternância Equipe Hub/Google, seleção de espaço, histórico e recolhimento. Não há webhooks/PubSub, upload, edição de mensagens, bot ou notificações automáticas de demandas. Consulte [configuração Google](google-chat.md).

## 7. Arquitetura e dados

| Camada             | Componentes                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Frontend           | React 19, TypeScript, Vite, Tailwind 4, Radix, React Router, TanStack Query, React Hook Form e Zod                                  |
| API                | NestJS 11, autenticação/RBAC, catálogo de recursos, hooks transacionais, workflow técnico, pesquisa, importação e integração Google |
| Persistência       | PostgreSQL, Prisma 6, sete migrations SQL versionadas nesta referência                                                              |
| Componentes comuns | packages/ui, packages/types e packages/config                                                                                       |
| Extensão           | extensions/chrome-1doc; popup, service worker, coletor e interface flutuante                                                        |

Entidades principais: User/Role/Permission; Equipment/Network/Hardware/Maintenance; KnowledgeArticle/Version/Recommendation/Solution/Script; Specification/Version/Requirement; Supplier; Request/Item; Process; Proposal/Item; Analysis/Result; Commitment/Item; Inspection/Item; Timeline; DocumentReference/DocumentFile; SystemEntry; Demand/Dispatch/Snapshot; TeamMessage; GoogleChatConnection; ExtensionCredential; AIConversation/Message; AuditLog.

Em desenvolvimento, frontend em localhost:5173 e API em localhost:3001/api. Vite encaminha /api; o navegador não acessa PostgreSQL. Docker Compose fornece frontend Nginx, API e PostgreSQL com volume. PostgreSQL incorporado é alternativa local de desenvolvimento, restrita ao loopback.

Rotas de interface: dashboard, /equipment, /maintenance, /knowledge, /recommendations, /solutions, /scripts, /specifications, /requests, /acquisitions, /suppliers, /proposals, /analyses, /commitments, /inspections, /documents, /systems, /demands, /assistant, /administration, /profile e /tools; setores em /departments.

Grupos de API: /auth; /users; /catalog, /dashboard e /search; /records/:resource; /lookups; /analyses/:id/evaluate e /conclude; /inspections/:id/evaluate; /imports/1doc e /extension; /chat; /ai; /audit e /profile. Consulte os controllers para os contratos completos. Validações Zod recusam campos desconhecidos nos corpos de alteração.

## 8. Segurança e operação

- Sessão JWT de oito horas em cookie HttpOnly, SameSite=Strict, Secure em produção. Versão de sessão no banco permite invalidar sessões por troca de senha ou desativação.
- Origem de mutações com cookie conferida contra CORS_ORIGIN quando presente; política CORS e SameSite complementam o controle. Login e API têm limites de requisições.
- RBAC é aplicado no servidor, incluindo dependências de módulos e fontes de pesquisa. Históricos do assistente são pessoais, com revalidação das fontes ao consultar respostas anteriores.
- Senhas, hashes e tokens não são retornados na gestão de usuários nem incluídos nos logs de requisição. Segredos ficam fora do Git. Backup com credenciais criptografadas exige preservação separada da chave AES-GCM.
- Mutações de recursos, versões, histórico e auditoria são transacionais. Espera por transação limitada a dez segundos e duração padrão a quinze segundos.
- Dados fictícios não são criados na inicialização padrão. HUB_DEMO_DATA só deve ser habilitado em homologação. Testes HTTP que gravam fixtures exigem HUB_ALLOW_TEST_DATA=true; testes automatizados padrão não usam a base operacional.

Antes de produção: homologar permissões e fluxos com a equipe, definir domínio/TLS, estratégia de backup PostgreSQL com restauração ensaiada, segregação de ambientes, retenção de dados e logs, monitoramento, gestão de contas, recuperação de acesso e revisão de segurança. A execução local atual não equivale a ambiente de produção homologado.

## 9. Critérios de aceitação

| ID    | Critério verificável                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-01 | Conta ativa entra por usuário/e-mail; conta inativa não entra; Consulta não grava; Técnico não administra usuários                                       |
| CA-02 | Trocar senha invalida JWT anterior e credencial da extensão; reativar conta não restaura sessão antiga                                                   |
| CA-03 | Base limpa mostra estados vazios e aceita novos cadastros; reexecutar seed padrão não insere demonstrações                                               |
| CA-04 | Alterar POP/descritivo preserva versões antigas; atualizar só conteúdo de descritivo preserva requisitos                                                 |
| CA-05 | Proposta/análise/empenho com vínculos inconsistentes são recusados; conclusão ATENDE com pendência é recusada                                            |
| CA-06 | Avaliação e conclusão concorrentes não produzem análise concluída ATENDE com requisito divergente; conferências concorrentes mantêm agregado consistente |
| CA-07 | Coletar no 1Doc mostra revisão; salvar cria uma demanda; atualizar preserva autoria de despachos, observações e classificação interna                    |
| CA-08 | Memorando classificado como aquisição mantém seu tipo e cria um processo vinculado, sem duplicação na atualização                                        |
| CA-09 | Chat preserva rascunho em erro; repetir requestId não duplica mensagem; erro Google identifica operação e código sem mostrar tokens                      |
| CA-10 | Pesquisa e assistente respeitam RBAC e NO_AI; nenhuma integração mock aparece como uma operação real bem-sucedida                                        |

## 10. Evolução priorizada

Prioridade 1: backup/restauração institucional, ambiente de homologação separado, cadastro e qualidade dos dados reais, gestão de identidade/recuperação e homologação da extensão em diferentes documentos 1Doc.

Prioridade 2: editor de múltiplos itens, OCR para anexos digitalizados, contatos de fornecedores, revisão editorial de POP e ferramentas administrativas de perfis.

Prioridade 3: GLPI real, Google Drive/Docs com OAuth, launcher local RDP/VNC/SMB e IA externa com política de dados, citações e homologação. Hoje essas integrações permanecem mock ou referências externas; IA usa recuperação lexical, sem embeddings/OCR. Scripts não são executados pelo Hub. ICMP é opcional, manual e limitado a IPv4 privado cadastrado.

Veja também [operação](operacao.md), [revisão de código](revisao-codigo.md), [arquitetura](architecture.md) e [domínio](domain.md).

## Integração com suporte — 08/10/2026

RF-07 e RF-12: classificação SUPORTE gera um atendimento único em /maintenance, inclusive para demandas anteriores por sincronização autenticada. Equipamento opcional; diagnóstico, procedimento e solução manuais são preservados nas recoletas. Situação e observações internas são sincronizadas nas duas telas. Origem, despachos, anexos e timeline interativa com descrição breve local ficam disponíveis no atendimento. Oitava migration: 20261008150000_support_demand_bridge.

## Perfil e navegação — 08/10/2026

Meu perfil permite editar nome, cargo/função, setor, telefone/ramal e apresentação. Usuário, e-mail e permissões continuam sob gestão administrativa. Campos novos são opcionais; o perfil não publica credenciais. Alterações pessoais e de tema são auditadas. Migração 20261008160000_user_profile (nona migração).

Busca, situação, classificação, ordenação e página das listas são preservadas na URL. Buscas aguardam 250 ms após a digitação e cancelam requisições superadas. Paginação conserva os dados anteriores enquanto atualiza. As demandas carregam apenas informações da lista; conteúdo completo e despachos são obtidos nos detalhes. A pesquisa de suporte/aquisições também considera número, título e despachos do documento original.

Seletores de vínculos têm pesquisa no servidor e preservam a seleção atual mesmo fora dos primeiros 100 registros. Suporte sem equipamento pode ser editado; vínculo de equipamento pode ser removido. E-mail opcional vazio não bloqueia o formulário.

O painel inicial apresenta atendimentos de suporte abertos. Menu e chat guardam sua preferência de abertura por usuário neste navegador. Módulos são carregados conforme a navegação; o menu permanece disponível durante o carregamento. Erros de conexão apresentam mensagem legível, e falhas de tela oferecem recuperação.

# Extensão Chrome · Coletor 1Doc

A extensão 1.2 inclui um botão flutuante **UGB · TI Hub** na página de leitura do 1Doc. Clique nele, depois em **Coletar documento**, revise o resumo e selecione **Suporte**, **Aquisição** ou **Outra**. O botão **Salvar demanda** ou **Atualizar demanda** confirma o envio, copia anexos acessíveis e abre o registro no Hub. O popup na barra do Chrome também oferece esse fluxo. A coleta, sozinha, não salva nada.

O tipo de origem permanece intacto: um Memorando pode ser classificado como Aquisição no Hub sem perder seu tipo original. Salvar ou classificar como Aquisição cria uma requisição, um descritivo e um processo **A conferir**, vinculados à demanda. Novas coletas atualizam o mesmo processo e preservam os despachos e os arquivos já copiados. Não são criados fornecedores, preços, quantidades confirmadas, requisitos presumidos ou empenhos.

## Instalação local

1. Abra `chrome://extensions` no Chrome e ative **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e selecione a pasta `extensions/chrome-1doc` deste projeto. Se receber o ZIP, extraia-o primeiro e selecione a pasta que contém `manifest.json`.
3. Fixe **UGB TI Hub · Coletor 1Doc** na barra do Chrome.
4. No TI Hub, entre com um perfil com permissão de escrita em demandas e abra **Meu perfil → Extensão Chrome → Gerar chave para extensão**.
5. Na extensão, abra **Conexão com o Hub**, informe `http://localhost:5173` (ou o endereço HTTPS do Hub) e cole a chave. Clique em **Salvar e verificar conexão**.
6. Recarregue a página do 1Doc, carregue os despachos desejados e use o botão flutuante **UGB · TI Hub → Coletar documento → Salvar/Atualizar demanda**.

Para atualizar uma instalação anterior, baixe o ZIP em **Meu perfil**, substitua os arquivos pela versão 1.2 e clique em **Recarregar** na extensão em `chrome://extensions`. Confira o acesso aos sites do 1Doc e ao S3 usado pelos anexos; recarregue a página do documento. As configurações do Hub e a chave permanecem se você atualizar a mesma extensão. Recolha e atualize demandas antigas para copiar seus arquivos.

O Hub e sua API devem estar funcionando. Na produção, o frontend deve encaminhar `/api` para o backend. A extensão solicita acesso ao domínio HTTPS do Hub configurado e registra um content script nos sites `https://*.1doc.com.br/*` para exibir o botão flutuante. Os dados só são coletados e enviados após cliques explícitos. A leitura pelo popup também usa acesso temporário à aba ativa.

## Dados preservados

- Tipo atribuído pelo 1Doc, número, ID da emissão, domínio de origem, endereço do documento e código/link de consulta externa.
- Assunto/categoria, texto original com quebras de linha e assinatura, solicitante, cargo, setores, data de abertura, situação e marcadores selecionados.
- Campos adicionais preenchidos, como tipo de atendimento, nome, patrimônio e outros disponíveis no documento.
- Cada despacho carregado: ID, ordem, título/tipo da movimentação, data completa, autor, cargo/setor, destinatários/CC, situação, conteúdo, assinatura, menções, campos adicionais, anexos e links.
- Anexos e imagens acessíveis são copiados para o PostgreSQL do Hub: até 8 MB por arquivo e 50 URLs por coleta. PDF com texto, DOCX, XLSX, TXT e CSV têm extração local, limitada a 200 mil caracteres por arquivo. Arquivos digitalizados e formatos não suportados são preservados com aviso para conferência manual, sem OCR ou envio a serviços de IA.
- Contexto textual e metadados de cada despacho. Cada coleta gera uma versão armazenada no banco, com usuário e data, para preservar alterações históricas.

O coletor foi ajustado ao HTML de leitura interno fornecido, com `.page-header-ver`, `.emissao_conteudo` e `.despachos`. A classificação vem do cabeçalho: **Circular** permanece Circular e **Chamado técnico** permanece Chamado técnico, independentemente do menu. Outros tipos que usam essa estrutura mantêm seu nome original. Layouts diferentes são recusados até que haja um adaptador.

## Coletas parciais e gestão

Somente dados carregados no DOM são acessíveis. Conteúdo que depende de expansão, paginação ou carregamento posterior deve ser aberto no 1Doc antes da coleta. O popup exibe aviso de coleta parcial e de despachos sem conteúdo. Não há navegação ou consultas automáticas aos endpoints internos do 1Doc.

Despachos ausentes numa coleta posterior não são excluídos. Um cabeçalho sem conteúdo não apaga texto/anexos já importados. Correções na origem atualizam o despacho e ficam preservadas no histórico das coletas. A identidade é o domínio do município mais o ID da emissão.

No Hub, **Demandas** oferece busca, detalhes, conteúdo original, dados coletados e despachos. **Situação no Hub** e **Observações internas** podem ser editadas sem modificar o 1Doc e permanecem após novas coletas. Tipo e situação da origem são campos separados. Demandas ficam fora das fontes do assistente por padrão (`NO_AI`).

## Chave e permissões

A chave da extensão é aleatória, vale por 30 dias, pertence ao usuário e pode ser revogada em **Meu perfil**. O servidor guarda somente seu hash. Ela permite apenas `GET /api/extension/session`, `GET /api/extension/demand`, `POST /api/extension/documents` e `POST /api/imports/1doc`, exigindo as permissões atuais `demands.read` e `demands.write`. Não permite acessar outros endpoints ou gerar novas chaves.

O popup guarda a chave no armazenamento local do Chrome e não guarda o HTML nem o payload coletado. **Desconectar** remove a chave daquele navegador; **Revogar** no Hub invalida seu uso no servidor. Cookies, scripts, inputs e rascunhos não são coletados. O endereço de origem retém apenas parâmetros de identificação do documento.

Downloads usam a sessão do navegador no 1Doc e os links assinados do S3. Assinaturas temporárias ficam somente na memória da extensão, fora do payload e do armazenamento do Hub. A chave do Hub é enviada exclusivamente ao Hub. Para outros domínios sem acesso concedido ou downloads recusados, a demanda é salva com um aviso; baixe o arquivo no 1Doc e use **Anexar cópia** no processo. Downloads de cópias exigem sessão do Hub e acesso ao módulo do documento.

## Uso no processo de aquisição

Em **Aquisições**, abra o processo. **Origem e despachos** apresenta o documento e cada movimentação; **Resumo** reúne requisição, descritivo, anexos, orçamentos e propostas. A categoria do arquivo pode ser corrigida. **Ver texto extraído** permite conferir o conteúdo; **Usar no descritivo para conferência** carrega esse texto no formulário, sem salvar automaticamente.

Confirme quantidade e requisitos no formulário e clique em **Conferir descritivo e quantidade**. Cadastre fornecedor e proposta com os valores efetivos do orçamento. **Analisar este produto** cria a comparação da oferta com a versão conferida. A avaliação admite evidência e links de referência por requisito. Uma versão já utilizada por análises é preservada; a revisão não a substitui. A política NO_AI da aquisição também protege as fontes derivadas do assistente.

A migration concede leitura/escrita a ADMINISTRADOR e TECNICO e somente leitura a CONSULTA. Roles personalizados precisam receber permissões de demandas pela administração do banco.

## Verificação

`pnpm test` verifica o coletor com fixture anonimizada e DOM simulado. `pnpm test:1doc`, com API e PostgreSQL ativos, executa coletor → credencial → importação → demanda/despachos, atualização, captura parcial, retenção de observações, busca, RBAC, restrição de token e revogação. Cria somente demanda fictícia QA, sem importar os dados pessoais do HTML anexado.

O HTML fornecido foi analisado sem executar seus scripts: reconheceu Chamado técnico 2.852/2026, assunto NovoServ - Usuários, dois campos adicionais preenchidos e um despacho. A extensão não foi instalada no Chrome nem testada numa sessão autenticada do 1Doc neste ambiente. A instalação manual e um teste real com **Coletar** ainda são necessários para confirmar o comportamento do Chrome e variações dinâmicas de layout. Não foi publicada na Chrome Web Store.

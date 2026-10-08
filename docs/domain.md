# Domínio e regras

Equipment pertence a Department e possui rede e hardware próprios. MaintenanceRecord armazena caso técnico, técnico responsável, diagnóstico, procedimento, solução, componentes e encaminhamento. EquipmentStatusHistory armazena transições manuais. AuditLog registra a mutação administrativa; não é o histórico técnico.

KnowledgeArticle identifica um POP; KnowledgeArticleVersion preserva conteúdo e autoria por versão. TechnicalRecommendation armazena orientação prática e vínculo opcional a caso. RecommendationFeedback é independente do conteúdo. KnownSolution representa algo efetivamente resolvido. ScriptEntry é uma biblioteca consultiva, sem executor.

TechnicalSpecification identifica um padrão. SpecificationVersion preserva o texto e SpecificationRequirement seus requisitos estruturados. PurchaseRequestItem referencia uma versão específica. Alterar o padrão não altera a versão usada em uma aquisição anterior.

PurchaseProcess centraliza a camada técnica de uma requisição. Proposal pertence a processo e fornecedor. ProposalItem referencia o item solicitado. TechnicalAnalysis referencia produto e versão; AnalysisRequirementResult compara requisitos individualmente com evidência, motivo e observação de equivalência.

ATENDE, DIVERGENCIA e PENDENTE são resultados técnicos. Não representam aprovação administrativa do fornecedor. A análise só é concluída via ação manual com fundamentação. ATENDE exige que todos os requisitos estejam atendidos; pendências e divergências precisam ser revistas pelo técnico. Uma análise concluída não aceita alteração de avaliações.

Commitment representa referência técnica ao empenho oficial e pertence ao fornecedor, processo e requisição. CommitmentItem referencia o produto ofertado. TechnicalInspection e InspectionItem comparam oferta e entrega. O agregado visual reflete os resultados individuais sem executar decisões administrativas.

TimelineEvent pertence a um processo e identifica fornecedor/técnico. Eventos de conferência e conclusão são criados na mesma transação dos resultados. Não existe timeline global.

DocumentReference aponta para o documento original e valida a entidade vinculada. DocumentFile preserva a cópia binária, o texto extraído e o estado da extração; downloads exigem sessão e permissão no módulo vinculado. A extensão copia anexos após confirmação de salvamento. Dados fictícios do seed não devem ser confundidos com evidências institucionais reais.

Demand AQUISICAO tem no máximo um PurchaseProcess vinculado por sourceDemandId. A importação cria uma requisição A_CONFERIR e um descritivo EM_REVISAO; quantidade e requisitos precisam de conferência. Identidades de documentos usam processo, URL sem assinatura temporária e ID do despacho. Novas coletas preservam cópias existentes se o download falhar. A conferência cria nova SpecificationVersion e atualiza o item antes de análises; versões já analisadas permanecem imutáveis. AnalysisRequirementResult preserva os links de referência usados pela equipe.

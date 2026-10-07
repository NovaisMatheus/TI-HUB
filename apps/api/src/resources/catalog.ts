import { z } from 'zod';
export interface Field {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'select' | 'tags';
  options?: string[];
  ref?: string;
  optional?: boolean;
}
export interface Resource {
  model: string;
  label: string;
  singular: string;
  permission: string;
  title: string;
  search: string[];
  columns: string[];
  fields: Field[];
  include?: Record<string, unknown>;
  immutable?: boolean;
}
const f = (name: string, label: string, extra: Partial<Field> = {}): Field => ({
  name,
  label,
  ...extra,
});
const ref = (name: string, label: string, resource: string, optional = false) =>
  f(name, label, { ref: resource, optional });
const text = (name: string, label: string, optional = false) =>
  f(name, label, { type: 'textarea', optional });
const select = (name: string, label: string, options: string[]) =>
  f(name, label, { type: 'select', options });
const num = (name: string, label: string) => f(name, label, { type: 'number' });
export const equipmentStatuses = [
  'OPERACIONAL',
  'COM_PROBLEMA',
  'EM_DIAGNOSTICO',
  'EM_MANUTENCAO',
  'AGUARDANDO_PECA',
  'AGUARDANDO_FORNECEDOR',
  'ENCAMINHADO_ASSISTENCIA',
  'INDISPONIVEL',
  'BAIXADO',
];
export const catalog: Record<string, Resource> = {
  demands: {
    model: 'demand',
    label: 'Demandas',
    singular: 'Demanda',
    permission: 'demands',
    title: 'title',
    search: ['title', 'number', 'documentType', 'description', 'requester', 'sourceStatus'],
    columns: ['number', 'documentType', 'title', 'requester', 'status', 'sourceStatus'],
    fields: [
      select('status', 'Situação no Hub', ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO', 'CONCLUIDA']),
      text('notes', 'Observações internas', true),
    ],
    include: { dispatches: { orderBy: { sequence: 'asc' } } },
  },
  departments: {
    model: 'department',
    label: 'Setores',
    singular: 'Setor',
    permission: 'equipment',
    title: 'name',
    search: ['name', 'location'],
    columns: ['name', 'location'],
    fields: [f('name', 'Nome'), f('location', 'Localização')],
  },
  equipment: {
    model: 'equipment',
    label: 'Equipamentos',
    singular: 'Equipamento',
    permission: 'equipment',
    title: 'hostname',
    search: ['hostname', 'assetTag', 'serial', 'manufacturer', 'model', 'assignedUser'],
    columns: ['hostname', 'assetTag', 'assignedUser', 'status'],
    include: {
      department: true,
      equipmentNetwork_equipment: true,
      equipmentHardware_equipment: true,
    },
    fields: [
      f('hostname', 'Hostname'),
      f('assetTag', 'Patrimônio'),
      f('serial', 'Serial'),
      f('manufacturer', 'Fabricante'),
      f('model', 'Modelo'),
      f('assignedUser', 'Usuário'),
      ref('departmentId', 'Setor', 'departments'),
      select('status', 'Status técnico', equipmentStatuses),
      f('ip', 'Endereço IP'),
      f('cpu', 'Processador'),
      f('ram', 'Memória RAM'),
      f('storage', 'Armazenamento'),
      f('os', 'Sistema operacional'),
      text('notes', 'Observações', true),
    ],
  },
  maintenance: {
    model: 'maintenanceRecord',
    label: 'Intervenções',
    singular: 'Intervenção',
    permission: 'maintenance',
    title: 'problem',
    search: ['problem', 'diagnosis', 'procedure', 'solution', 'components'],
    columns: ['problem', 'type', 'status', 'occurredAt'],
    include: { equipment: true, technician: { select: { id: true, name: true } } },
    fields: [
      ref('equipmentId', 'Equipamento', 'equipment'),
      select('type', 'Tipo', [
        'OCORRENCIA',
        'DIAGNOSTICO',
        'MANUTENCAO',
        'INSTALACAO',
        'FORMATACAO',
        'TROCA_COMPONENTE',
        'CONFIGURACAO',
        'MOVIMENTACAO',
        'ASSISTENCIA',
        'RETORNO',
        'OBSERVACAO',
      ]),
      text('problem', 'Problema relatado'),
      text('diagnosis', 'Diagnóstico', true),
      text('procedure', 'Procedimento', true),
      text('solution', 'Solução', true),
      f('components', 'Componentes substituídos', { optional: true }),
      f('referral', 'Encaminhamento', { optional: true }),
      select('status', 'Status', ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA']),
      text('notes', 'Observações', true),
    ],
  },
  knowledge: {
    model: 'knowledgeArticle',
    label: 'POPs',
    singular: 'POP',
    permission: 'knowledge',
    title: 'title',
    search: ['code', 'title', 'category'],
    columns: ['code', 'title', 'category', 'status'],
    include: {
      knowledgeArticleVersion_article: { orderBy: { version: 'desc' } },
      author: { select: { name: true } },
    },
    fields: [
      f('code', 'Código'),
      f('title', 'Título'),
      f('category', 'Categoria'),
      f('tags', 'Tags', { type: 'tags', optional: true }),
      select('status', 'Status', ['VIGENTE', 'EM_REVISAO', 'ARQUIVADO']),
      text('content', 'Conteúdo da nova versão'),
    ],
  },
  recommendations: {
    model: 'technicalRecommendation',
    label: 'Recomendações',
    singular: 'Recomendação',
    permission: 'knowledge',
    title: 'title',
    search: ['title', 'description', 'context', 'category'],
    columns: ['title', 'category', 'priority', 'status'],
    fields: [
      f('title', 'Título'),
      text('description', 'Descrição'),
      f('category', 'Categoria'),
      f('tags', 'Tags', { type: 'tags', optional: true }),
      text('context', 'Contexto'),
      text('justification', 'Justificativa'),
      text('appliesWhen', 'Quando se aplica'),
      text('doesNotApplyWhen', 'Quando não se aplica'),
      select('priority', 'Prioridade', [
        'SUGESTAO',
        'RECOMENDADO',
        'PROCEDIMENTO_PREFERENCIAL',
        'ATENCAO',
      ]),
      select('status', 'Status', ['VIGENTE', 'EM_REVISAO', 'ARQUIVADO']),
      ref('maintenanceId', 'Caso de origem', 'maintenance', true),
    ],
  },
  solutions: {
    model: 'knownSolution',
    label: 'Soluções conhecidas',
    singular: 'Solução',
    permission: 'knowledge',
    title: 'title',
    search: ['title', 'description', 'category'],
    columns: ['title', 'category'],
    fields: [
      f('title', 'Título'),
      text('description', 'Solução comprovada'),
      f('category', 'Categoria'),
      f('tags', 'Tags', { type: 'tags', optional: true }),
      ref('maintenanceId', 'Caso resolvido', 'maintenance', true),
    ],
  },
  scripts: {
    model: 'scriptEntry',
    label: 'Scripts',
    singular: 'Script',
    permission: 'knowledge',
    title: 'name',
    search: ['name', 'description', 'language'],
    columns: ['name', 'language', 'version', 'category'],
    fields: [
      f('name', 'Nome'),
      text('description', 'Descrição'),
      select('language', 'Linguagem', ['PowerShell', 'Bash', 'Batch']),
      num('version', 'Versão'),
      f('category', 'Categoria'),
      text('code', 'Código — somente consulta'),
      text('notes', 'Observações', true),
    ],
  },
  specifications: {
    model: 'technicalSpecification',
    label: 'Descritivos técnicos',
    singular: 'Descritivo',
    permission: 'acquisition',
    title: 'name',
    search: ['code', 'name', 'category', 'summary'],
    columns: ['code', 'name', 'category', 'status'],
    include: {
      specificationVersion_specification: {
        orderBy: { version: 'desc' },
        include: { specificationRequirement_version: true },
      },
    },
    fields: [
      f('code', 'Código'),
      f('name', 'Nome'),
      f('category', 'Categoria'),
      text('summary', 'Descrição resumida'),
      select('status', 'Status', ['VIGENTE', 'SUBSTITUIDO', 'DESCONTINUADO', 'EM_REVISAO']),
      text('content', 'Texto da nova versão'),
      text(
        'requirements',
        'Requisitos: grupo | campo | operador | valor | unidade | tipo (um por linha)',
      ),
    ],
  },
  suppliers: {
    model: 'supplier',
    label: 'Fornecedores',
    singular: 'Fornecedor',
    permission: 'acquisition',
    title: 'tradeName',
    search: ['legalName', 'tradeName', 'cnpj', 'email'],
    columns: ['tradeName', 'cnpj', 'email', 'phone'],
    fields: [
      f('legalName', 'Razão social'),
      f('tradeName', 'Nome fantasia'),
      f('cnpj', 'CNPJ'),
      f('phone', 'Telefone'),
      f('email', 'Email', { type: 'email' }),
      text('notes', 'Observações', true),
    ],
  },
  requests: {
    model: 'purchaseRequest',
    label: 'Requisições',
    singular: 'Requisição',
    permission: 'acquisition',
    title: 'object',
    search: ['number', 'object', 'description', 'unit'],
    columns: ['number', 'year', 'object', 'status'],
    include: {
      department: true,
      purchaseRequestItem_request: { include: { specificationVersion: true } },
    },
    fields: [
      f('number', 'Número'),
      num('year', 'Ano'),
      f('unit', 'Unidade solicitante'),
      ref('departmentId', 'Setor', 'departments'),
      f('object', 'Objeto'),
      text('description', 'Descrição'),
      select('status', 'Status', ['RECEBIDA', 'EM_ANALISE', 'ENCAMINHADA', 'CONCLUIDA']),
      ref('specificationVersionId', 'Versão do descritivo', 'specification-versions'),
      num('quantity', 'Quantidade'),
    ],
  },
  acquisitions: {
    model: 'purchaseProcess',
    label: 'Processos de aquisição',
    singular: 'Processo',
    permission: 'acquisition',
    title: 'title',
    search: ['number', 'title', 'status'],
    columns: ['number', 'title', 'status', 'date'],
    include: { request: { include: { department: true } } },
    fields: [
      f('number', 'Número do processo'),
      f('title', 'Título'),
      ref('requestId', 'Requisição', 'requests'),
      select('status', 'Status', [
        'EM_ANALISE',
        'AGUARDANDO_PROPOSTA',
        'AGUARDANDO_ENTREGA',
        'EM_CONFERENCIA',
        'CONCLUIDO',
      ]),
    ],
  },
  proposals: {
    model: 'proposal',
    label: 'Propostas',
    singular: 'Proposta',
    permission: 'acquisition',
    title: 'id',
    search: ['notes'],
    columns: ['supplier', 'process', 'date'],
    include: { supplier: true, process: true, proposalItem_proposal: true },
    fields: [
      ref('processId', 'Processo', 'acquisitions'),
      ref('supplierId', 'Fornecedor', 'suppliers'),
      ref('requestItemId', 'Item requisitado', 'request-items'),
      f('brand', 'Marca'),
      f('model', 'Modelo'),
      f('manufacturer', 'Fabricante'),
      num('quantity', 'Quantidade'),
      num('price', 'Preço unitário'),
      text('offeredDescription', 'Descrição ofertada'),
      f('manufacturerUrl', 'URL do fabricante', { type: 'url', optional: true }),
      text('notes', 'Observações', true),
    ],
  },
  analyses: {
    model: 'technicalAnalysis',
    label: 'Análises técnicas',
    singular: 'Análise',
    permission: 'analysis',
    title: 'id',
    search: ['notes', 'status', 'conclusion'],
    columns: ['proposalItem', 'status', 'conclusion', 'createdAt'],
    include: {
      process: true,
      proposalItem: { include: { proposal: { include: { supplier: true } } } },
      specificationVersion: { include: { specification: true } },
      analysisRequirementResult_analysis: { include: { requirement: true } },
    },
    fields: [
      ref('processId', 'Processo', 'acquisitions'),
      ref('proposalItemId', 'Produto ofertado', 'proposal-items'),
      ref('specificationVersionId', 'Versão do descritivo', 'specification-versions'),
      text('notes', 'Observações', true),
    ],
    immutable: true,
  },
  commitments: {
    model: 'commitment',
    label: 'Empenhos',
    singular: 'Empenho',
    permission: 'acquisition',
    title: 'number',
    search: ['number', 'status'],
    columns: ['number', 'year', 'supplier', 'status'],
    include: {
      supplier: true,
      process: true,
      commitmentItem_commitment: { include: { proposalItem: true } },
    },
    fields: [
      f('number', 'Número'),
      num('year', 'Ano'),
      ref('supplierId', 'Fornecedor', 'suppliers'),
      ref('processId', 'Processo', 'acquisitions'),
      ref('requestId', 'Requisição', 'requests'),
      ref('proposalItemId', 'Produto ofertado', 'proposal-items'),
      num('quantity', 'Quantidade'),
      num('value', 'Valor unitário'),
      select('status', 'Status', ['EMITIDO', 'AGUARDANDO_ENTREGA', 'ENTREGUE', 'CANCELADO']),
    ],
  },
  inspections: {
    model: 'technicalInspection',
    label: 'Conferências',
    singular: 'Conferência',
    permission: 'inspection',
    title: 'id',
    search: ['notes', 'result'],
    columns: ['commitment', 'result', 'date'],
    include: {
      commitment: { include: { supplier: true, process: true } },
      inspectionItem_inspection: {
        include: { commitmentItem: { include: { proposalItem: true } } },
      },
    },
    fields: [ref('commitmentId', 'Empenho', 'commitments'), text('notes', 'Observações', true)],
    immutable: true,
  },
  documents: {
    model: 'documentReference',
    label: 'Documentos',
    singular: 'Referência documental',
    permission: 'documents',
    title: 'title',
    search: ['title', 'description', 'externalId'],
    columns: ['title', 'provider', 'entityType', 'createdAt'],
    fields: [
      f('title', 'Título'),
      select('provider', 'Origem', ['URL', 'INTERNAL', 'GOOGLE_DRIVE', 'GOOGLE_DOCS']),
      f('externalId', 'ID externo', { optional: true }),
      f('url', 'URL', { type: 'url' }),
      f('mimeType', 'Tipo MIME'),
      text('description', 'Descrição'),
      select('entityType', 'Tipo de vínculo', [
        'demands',
        'equipment',
        'maintenance',
        'knowledge',
        'recommendations',
        'acquisitions',
        'suppliers',
        'proposals',
        'analyses',
        'commitments',
        'inspections',
      ]),
      f('entityId', 'ID do registro relacionado'),
    ],
  },
  systems: {
    model: 'systemEntry',
    label: 'Sistemas',
    singular: 'Sistema',
    permission: 'systems',
    title: 'name',
    search: ['name', 'description', 'category'],
    columns: ['name', 'category', 'environment', 'responsible'],
    fields: [
      f('name', 'Nome'),
      text('description', 'Descrição'),
      f('url', 'URL', { type: 'url' }),
      select('category', 'Categoria', [
        'Administrativo',
        'Financeiro',
        'Saúde',
        'Educação',
        'RH',
        'TI',
        'Comunicação',
        'Outros',
      ]),
      f('responsible', 'Responsável'),
      select('environment', 'Ambiente', ['Produção', 'Homologação', 'Documentação']),
      text('notes', 'Observações', true),
    ],
  },
};
export function resourceSchema(resource: Resource, partial = false) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of resource.fields) {
    let schema: z.ZodTypeAny =
      field.type === 'number'
        ? z.coerce.number().finite().nonnegative()
        : field.type === 'tags'
          ? z.array(z.string().max(80)).max(30)
          : field.options
            ? z.enum(field.options as [string, ...string[]])
            : z
                .string()
                .trim()
                .min(field.optional ? 0 : 1)
                .max(field.type === 'textarea' ? 50000 : 500);
    if (field.type === 'email') schema = z.string().email();
    if (field.type === 'url')
      schema = z
        .string()
        .refine((v) => (!v && field.optional) || /^https?:\/\//i.test(v), 'Use URL http ou https.');
    if (field.name === 'ip') schema = z.string().ip({ version: 'v4' });
    if (['quantity', 'year', 'version'].includes(field.name))
      schema = z.coerce.number().int().positive();
    if (partial || field.optional) schema = schema.optional();
    shape[field.name] = schema;
  }
  return z.object(shape).strict();
}

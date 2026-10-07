export interface Entity {
  id: string;
  [key: string]: unknown;
}
export interface Field {
  name: string;
  label: string;
  type?: string;
  options?: string[];
  ref?: string;
  optional?: boolean;
}
export interface Resource {
  label: string;
  singular: string;
  permission: string;
  title: string;
  columns: string[];
  fields: Field[];
  immutable?: boolean;
}
export type Catalog = Record<string, Resource>;
export function object(value: unknown): Entity {
  return (value && typeof value === 'object' ? value : {}) as Entity;
}
export function entities(value: unknown): Entity[] {
  return Array.isArray(value) ? (value as Entity[]) : [];
}
export function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') {
    const row = object(value);
    return String(
      row.hostname ??
        row.tradeName ??
        row.name ??
        row.title ??
        row.number ??
        row.model ??
        row.id ??
        '—',
    );
  }
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value))
    return new Date(value).toLocaleDateString('pt-BR');
  return String(value);
}
export const labels: Record<string, string> = {
  documentType: 'Tipo no 1Doc',
  requester: 'Solicitante',
  sourceStatus: 'Situação no 1Doc',
  hostname: 'Equipamento',
  assetTag: 'Patrimônio',
  assignedUser: 'Usuário',
  status: 'Status',
  name: 'Nome',
  location: 'Localização',
  problem: 'Problema relatado',
  type: 'Tipo',
  occurredAt: 'Data',
  code: 'Código',
  title: 'Título',
  category: 'Categoria',
  priority: 'Prioridade',
  language: 'Linguagem',
  version: 'Versão',
  tradeName: 'Fornecedor',
  cnpj: 'CNPJ',
  email: 'Email',
  phone: 'Telefone',
  number: 'Número',
  year: 'Ano',
  object: 'Objeto',
  supplier: 'Fornecedor',
  process: 'Processo',
  date: 'Data',
  proposalItem: 'Produto ofertado',
  conclusion: 'Conclusão',
  createdAt: 'Registrado em',
  commitment: 'Empenho',
  result: 'Resultado',
  provider: 'Origem',
  entityType: 'Entidade',
  environment: 'Ambiente',
  responsible: 'Responsável',
};

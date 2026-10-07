export type TechnicalResult = 'ATENDE' | 'DIVERGENCIA' | 'PENDENTE';
export type DataPolicy = 'EXTERNAL_ALLOWED' | 'INSTITUTIONAL_ONLY' | 'NO_AI';
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  theme?: 'light' | 'dark' | 'system';
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Source {
  id: string;
  title: string;
  href: string;
  kind: 'official' | 'recommendation' | 'case' | 'document';
  excerpt: string;
}
export interface AIAnswer {
  answer: string;
  sources: Source[];
  provider: string;
  disclaimer: string;
}

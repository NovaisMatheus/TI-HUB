export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('json') ? await response.json() : null;
  if (!response.ok)
    throw new ApiError(
      typeof data?.message === 'string'
        ? data.message
        : response.status >= 500
          ? 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
          : 'Não foi possível concluir a operação.',
      response.status,
      data?.fields,
    );
  if (response.status !== 204 && !contentType.includes('json'))
    throw new ApiError(
      'O servidor retornou uma resposta inesperada. Atualize a página e tente novamente.',
      response.status,
    );
  return data as T;
}
export const send = <T>(path: string, data: unknown, method = 'POST') =>
  api<T>(path, { method, body: JSON.stringify(data) });

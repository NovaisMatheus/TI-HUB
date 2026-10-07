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
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      typeof data.message === 'string' ? data.message : 'Não foi possível concluir a operação.',
      response.status,
      data.fields,
    );
  return data as T;
}
export const send = <T>(path: string, data: unknown, method = 'POST') =>
  api<T>(path, { method, body: JSON.stringify(data) });

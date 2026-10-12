import { env } from './env';

type ApiOptions = RequestInit & {
  token?: string;
};

export async function apiClient<TResponse>(path: string, options: ApiOptions = {}): Promise<TResponse> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}


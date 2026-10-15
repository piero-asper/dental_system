import { env } from './env';
import { supabase } from './supabaseClient';

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API error ${status}`);
  }
}

type ApiOptions = RequestInit & {
  token?: string;
};

export async function apiClient<TResponse>(path: string, options: ApiOptions = {}): Promise<TResponse> {
  const { token: providedToken, ...requestOptions } = options;
  const token = providedToken ?? (await supabase?.auth.getSession())?.data.session?.access_token;
  const headers = new Headers(requestOptions.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...requestOptions,
    headers
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return response.status === 204 ? undefined as TResponse : response.json() as Promise<TResponse>;
}


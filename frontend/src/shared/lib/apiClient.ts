import { env } from './env';
import { supabase } from './supabaseClient';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly messages: string[] = []) {
    super(messages.join(' ') || `No se pudo completar la solicitud (${status}).`);
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
    signal: requestOptions.signal ? AbortSignal.any([requestOptions.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    headers
  });

  if (!response.ok) {
    if (response.status === 401) {
      await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    const body = await response.json().catch(() => null);
    const message: unknown = body?.error?.message ?? body?.message ?? body?.error;
    const messages = (Array.isArray(message) ? message : [message]).filter((item): item is string => typeof item === 'string');
    throw new ApiError(response.status, response.status >= 500 ? ['El servicio no está disponible. Intenta nuevamente.'] : messages);
  }

  return response.status === 204 ? undefined as TResponse : response.json() as Promise<TResponse>;
}


import { env } from './env';
import { supabase } from './supabaseClient';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly messages: string[] = []) {
    super(messages.join(' ') || `No se pudo completar la solicitud (${status}).`);
  }
}

type ApiOptions = RequestInit & {
  token?: string;
  responseType?: 'json' | 'text';
  timeoutMs?: number;
};

export async function apiClient<TResponse>(path: string, options: ApiOptions = {}): Promise<TResponse> {
  const { token: providedToken, responseType,timeoutMs=15000,...requestOptions } = options;
  const token = providedToken ?? (await supabase?.auth.getSession())?.data.session?.access_token;
  const headers = new Headers(requestOptions.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response:Response;
  try { response = await fetch(`${env.apiUrl}${path}`, {
    ...requestOptions,
    signal: requestOptions.signal ? AbortSignal.any([requestOptions.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    headers
  }); } catch(cause) {
    if(requestOptions.signal?.aborted)throw cause;
    if(cause instanceof DOMException && cause.name==='TimeoutError')throw new Error('El servidor tardó demasiado en responder. Conservamos tus datos; comprueba el resultado antes de volver a guardar.');
    throw new Error('No se pudo conectar con el servidor. Comprueba la conexión y vuelve a intentar; tus datos siguen en el formulario.');
  }

  if (!response.ok) {
    if (response.status === 401) {
      await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    const body = await response.json().catch(() => null);
    const message: unknown = body?.error?.message ?? body?.message ?? body?.error;
    const messages = (Array.isArray(message) ? message : [message]).filter((item): item is string => typeof item === 'string');
    throw new ApiError(response.status, response.status===401 ? ['Tu sesión venció. Vuelve a iniciar sesión.'] : response.status >= 500 ? ['El servicio no está disponible. Intenta nuevamente.'] : messages);
  }

  return response.status === 204 ? undefined as TResponse : responseType==='text' ? response.text() as Promise<TResponse> : response.json() as Promise<TResponse>;
}


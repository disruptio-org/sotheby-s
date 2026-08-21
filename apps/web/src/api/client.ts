/**
 * Thin fetch wrapper. Every call is same-origin (`/api/...`) — Vite proxies to
 * the API in dev — so the session cookie travels without any CORS dance.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }
}

const parseError = async (response: Response): Promise<ApiError> => {
  let code = 'error';
  let message = 'Ocorreu um erro inesperado.';

  try {
    const body: unknown = await response.json();
    const error =
      typeof body === 'object' && body !== null && 'error' in body
        ? (body as { error: unknown }).error
        : null;
    if (typeof error === 'object' && error !== null) {
      const record = error as Record<string, unknown>;
      if (typeof record.code === 'string') code = record.code;
      if (typeof record.message === 'string') message = record.message;
    }
  } catch {
    // A non-JSON body (proxy error page, network fault) keeps the defaults.
  }

  return new ApiError(response.status, code, message);
};

const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, 'network', 'Sem ligação ao servidor.');
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export const errorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'Ocorreu um erro inesperado.';

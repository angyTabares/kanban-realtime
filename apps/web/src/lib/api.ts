/**
 * Cliente HTTP con manejo de sesión:
 * - Adjunta el access token automáticamente.
 * - Si la API responde 401, intenta rotar el refresh token y reintenta.
 * - Expone helpers tipados para { data }.
 */

const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    message?: string,
  ) {
    super(message ?? 'Error inesperado');
  }
}

interface PendingTokens {
  accessToken: string;
  refreshToken: string;
  setTokens: (p: AuthTokens) => void;
}

// Registrado desde el store de auth para evitar dependencias circulares.
let getTokens: () => AuthTokens | null = () => null;
let refreshTokens: (() => Promise<AuthTokens>) | null = null;
let currentRefresh: Promise<AuthTokens> | null = null;

export function configureAuthBridge(opts: {
  getTokens: () => AuthTokens | null;
  refresh: () => Promise<AuthTokens>;
}) {
  getTokens = opts.getTokens;
  refreshTokens = opts.refresh;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry && refreshTokens) {
    currentRefresh = currentRefresh ?? refreshTokens().finally(() => {
      currentRefresh = null;
    });
    try {
      const fresh = await currentRefresh;
      headers.Authorization = `Bearer ${fresh.accessToken}`;
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    } catch {
      // Si el refresh falla, sesión terminada.
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = body as { message?: string | string[]; error?: string } | null;
    const message = Array.isArray(envelope?.message)
      ? envelope!.message![0]
      : envelope?.message ?? envelope?.error ?? res.statusText;
    throw new ApiError(res.status, typeof message === 'string' ? message : undefined, message);
  }

  return (body as { data: T }).data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export type { AuthTokens, PendingTokens };
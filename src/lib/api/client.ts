import type { z } from 'zod/v3';

/**
 * Base URL for the platform API (FastAPI backend). Falls back to the
 * discovery URL since both are served by the same service.
 */
export function getApiBaseUrl(): string | undefined {
  const base = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_DISCOVERY_API_URL;
  return base?.replace(/\/$/, '');
}

export function isApiConfigured(): boolean {
  return !!getApiBaseUrl();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function formatErrorDetail(body: unknown): string | undefined {
  if (body === null || typeof body !== 'object' || !('detail' in body)) return undefined;

  const detail = body.detail;
  if (typeof detail === 'string') return detail;
  if (!Array.isArray(detail)) return undefined;

  const messages = detail.flatMap((issue) => {
    if (issue === null || typeof issue !== 'object' || !('msg' in issue)) return [];
    if (typeof issue.msg !== 'string') return [];

    const location = 'loc' in issue && Array.isArray(issue.loc) ? issue.loc.join('.') : 'request';
    return `${location}: ${issue.msg}`;
  });
  return messages.length > 0 ? messages.join('; ') : undefined;
}

type ApiFetchOptions<T> = {
  schema: z.ZodType<T>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  searchParams?: Record<string, string | number | undefined>;
};

async function request(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string | number | undefined>;
  },
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError('API URL is not configured', 0);
  }

  const url = new URL(`/v1${path}`, baseUrl);
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  // Lazy import: pulling in the supabase client eagerly would validate the
  // full env at module load, breaking consumers (and tests) that never
  // actually issue a request.
  const { supabase } = await import('@/lib/supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const detail = formatErrorDetail(await response.json().catch(() => undefined));
    const message = `Request to ${path} failed (${response.status})`;
    throw new ApiError(detail ? `${message}: ${detail}` : message, response.status);
  }

  return response;
}

/**
 * Fetch a `/v1` platform API endpoint with the Supabase session token as a
 * Bearer credential, validating the response against a zod schema.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions<T>): Promise<T> {
  const response = await request(path, options);
  return options.schema.parse((await response.json()) as unknown);
}

export async function apiMutation<T>(
  path: string,
  options: Omit<ApiFetchOptions<T>, 'method'> & {
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  },
): Promise<T> {
  return apiFetch(path, options);
}

/** Send a mutation to a no-content `/v1` endpoint (saves, likes, etc.). */
export async function apiSend(
  path: string,
  options: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = { method: 'POST' },
): Promise<void> {
  await request(path, options);
}

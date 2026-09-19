import { z } from 'zod/v3';

import { ApiError, apiFetch, apiSend, getApiBaseUrl, isApiConfigured } from '@/lib/api/client';

const mockGetSession = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// babel-preset-expo rewrites EXPO_PUBLIC_* reads to a module that captures the
// process.env object at import — mutate keys in place, never reassign process.env.
const ORIGINAL_API_URL = process.env.EXPO_PUBLIC_API_URL;
const ORIGINAL_DISCOVERY_URL = process.env.EXPO_PUBLIC_DISCOVERY_API_URL;

function restoreKey(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://api-dev.example.com';
  delete process.env.EXPO_PUBLIC_DISCOVERY_API_URL;
  mockFetch.mockReset();
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue({ data: { session: null } });
});

afterAll(() => {
  restoreKey('EXPO_PUBLIC_API_URL', ORIGINAL_API_URL);
  restoreKey('EXPO_PUBLIC_DISCOVERY_API_URL', ORIGINAL_DISCOVERY_URL);
});

describe('getApiBaseUrl', () => {
  it('prefers EXPO_PUBLIC_API_URL over the discovery URL', () => {
    process.env.EXPO_PUBLIC_DISCOVERY_API_URL = 'https://other.example.com';
    expect(getApiBaseUrl()).toBe('https://api-dev.example.com');
  });

  it('falls back to EXPO_PUBLIC_DISCOVERY_API_URL', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_DISCOVERY_API_URL = 'https://other.example.com';
    expect(getApiBaseUrl()).toBe('https://other.example.com');
  });

  it('strips a trailing slash', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api-dev.example.com/';
    expect(getApiBaseUrl()).toBe('https://api-dev.example.com');
  });

  it('reports unconfigured when both variables are unset', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(getApiBaseUrl()).toBeUndefined();
    expect(isApiConfigured()).toBe(false);
  });
});

describe('apiFetch', () => {
  const schema = z.object({ value: z.string() });

  it('prefixes paths with /v1 and appends defined search params only', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ value: 'ok' }));
    await apiFetch('/feed/videos', {
      schema,
      searchParams: { lat: 51.5, cursor: undefined, limit: 20 },
    });

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.origin).toBe('https://api-dev.example.com');
    expect(url.pathname).toBe('/v1/feed/videos');
    expect(url.searchParams.get('lat')).toBe('51.5');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.has('cursor')).toBe(false);
  });

  it('sends the Supabase access token as a Bearer credential', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jwt-123' } } });
    mockFetch.mockResolvedValue(jsonResponse({ value: 'ok' }));

    await apiFetch('/feed/videos', { schema });

    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-123');
  });

  it('omits the Authorization header when there is no session', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ value: 'ok' }));

    await apiFetch('/feed/videos', { schema });

    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('serializes JSON bodies with a Content-Type header', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ value: 'ok' }));

    await apiFetch('/content', { schema, method: 'POST', body: { title: 'clip' } });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ title: 'clip' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('throws ApiError with the response status on failure', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, { ok: false, status: 401 }));

    await expect(apiFetch('/feed/videos', { schema })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
  });

  it('throws ApiError when no API URL is configured', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    await expect(apiFetch('/feed/videos', { schema })).rejects.toThrow(ApiError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects responses that fail schema validation', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ value: 42 }));

    await expect(apiFetch('/feed/videos', { schema })).rejects.toThrow();
  });
});

describe('apiSend', () => {
  it('completes no-content mutations without parsing a body', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });

    await expect(apiSend('/content/content-1', { method: 'DELETE' })).resolves.toBeUndefined();
    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/v1/content/content-1');
  });
});

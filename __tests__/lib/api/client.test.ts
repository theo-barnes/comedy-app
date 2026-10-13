import { z } from 'zod/v3';

import {
  ApiError,
  apiBinaryFetch,
  apiFetch,
  apiSend,
  getApiBaseUrl,
  getApiErrorMessage,
  isApiConfigured,
} from '@/lib/api/client';
import { createInstance, t } from 'i18next';

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

  it('sends an idempotency key and abort signal without replacing session authorization', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jwt-123' } } });
    mockFetch.mockResolvedValue(jsonResponse({ value: 'ok' }));
    const abort = new AbortController();
    await apiFetch('/events/native', {
      schema,
      method: 'POST',
      body: { title: 'Friday comedy' },
      idempotencyKey: 'submission-1',
      signal: abort.signal,
    });
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      headers: { 'Idempotency-Key': 'submission-1' },
      signal: abort.signal,
    });
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeDefined();
  });

  it('throws ApiError with the response status on failure', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, { ok: false, status: 401 }));

    await expect(apiFetch('/feed/videos', { schema })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
  });

  it('includes FastAPI validation details in errors', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        {
          detail: [{ loc: ['body', 'file', 'durationMs'], msg: 'Input should be greater than 0' }],
        },
        { ok: false, status: 422 },
      ),
    );

    await expect(apiFetch('/content', { schema, method: 'POST' })).rejects.toThrow(
      'Request to /content failed (422): body.file.durationMs: Input should be greater than 0',
    );
  });

  it.each([
    'schema_revision_behind',
    'schema_revision_unknown',
    'database_unreachable',
    'narration_unavailable',
  ])('retains readiness code %s and presents a localized unavailable message', async (code) => {
    mockFetch.mockResolvedValue(
      jsonResponse({ status: 'unavailable', code }, { ok: false, status: 503 }),
    );
    const error = await apiFetch('/creators/me', { schema }).catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, code });
    const translator = createInstance();
    await translator.init({
      lng: 'en',
      resources: {
        en: { translation: { common: { serviceUnavailable: 'Please retry shortly.' } } },
      },
    });
    if (!(error instanceof ApiError)) throw new Error('Expected ApiError');
    expect(getApiErrorMessage(error, translator.t)).toBe('Please retry shortly.');
  });

  it.each([
    { status: 'unavailable', code: { secret: 'must not render' } },
    { status: 'unavailable', code: 'unknown_code' },
    { code: 'schema_revision_behind' },
    null,
  ])('keeps generic errors for unrecognized readiness bodies: %j', async (body) => {
    mockFetch.mockResolvedValue(jsonResponse(body, { ok: false, status: 503 }));
    const error = await apiFetch('/creators/me', { schema }).catch((failure: unknown) => failure);
    if (!(error instanceof ApiError)) throw new Error('Expected ApiError');
    expect(getApiErrorMessage(error, t)).toBe('Request to /creators/me failed (503)');
  });

  it('preserves non-JSON proxy failures as generic ApiErrors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new SyntaxError('Not JSON');
      },
    });
    await expect(apiFetch('/creators/me', { schema })).rejects.toMatchObject({
      message: 'Request to /creators/me failed (503)',
      status: 503,
      code: undefined,
    });
  });

  it('retains domain codes without replacing their specific unavailable message', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        { error: { code: 'poster_unavailable', message: 'Image uploads are unavailable.' } },
        { ok: false, status: 503 },
      ),
    );
    const error = await apiFetch('/events/poster-config', { schema }).catch(
      (failure: unknown) => failure,
    );
    if (!(error instanceof ApiError)) throw new Error('Expected ApiError');
    expect(error.code).toBe('poster_unavailable');
    expect(getApiErrorMessage(error, t)).toBe(
      'Request to /events/poster-config failed (503): Image uploads are unavailable.',
    );
  });

  it('preserves ordinary errors and non-503 errors even with a readiness code', () => {
    expect(getApiErrorMessage(new Error('Local validation failed'), t)).toBe(
      'Local validation failed',
    );
    expect(
      getApiErrorMessage(new ApiError('Permission denied', 403, 'database_unreachable'), t),
    ).toBe('Permission denied');
  });

  it('throws ApiError when no API URL is configured', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    await expect(apiFetch('/feed/videos', { schema })).rejects.toThrow(ApiError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('surfaces the platform domain error message without exposing arbitrary error details', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        { error: { code: 'validation_failed', message: 'The poster is not a supported image.' } },
        { ok: false, status: 422 },
      ),
    );
    await expect(apiFetch('/events/event-1/poster', { schema, method: 'PUT' })).rejects.toThrow(
      'Request to /events/event-1/poster failed (422): The poster is not a supported image.',
    );
  });

  it('rejects responses that fail schema validation', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ value: 42 }));

    await expect(apiFetch('/feed/videos', { schema })).rejects.toThrow();
  });
});

describe('apiBinaryFetch', () => {
  it('authenticates the internal binary request and accepts the expected media type', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'jwt-123' } } });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'audio/mpeg; charset=binary' }),
    });
    const abort = new AbortController();

    await apiBinaryFetch('/accessibility/narration/event/event-1', {
      contentType: 'audio/mpeg',
      signal: abort.signal,
    });

    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api-dev.example.com/v1/accessibility/narration/event/event-1',
    );
    const request = mockFetch.mock.calls[0][1] as RequestInit;
    expect(request.signal).toBe(abort.signal);
    expect((request.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('rejects a successful response with an unexpected content type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await expect(
      apiBinaryFetch('/accessibility/narration/event/event-1', { contentType: 'audio/mpeg' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
    });
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

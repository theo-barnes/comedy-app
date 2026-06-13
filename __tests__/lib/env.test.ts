const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

function loadEnv() {
  let loaded: typeof import('@/lib/env').env;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/lib/env').env;
  });
  return loaded!;
}

describe('env schema', () => {
  it('parses a valid environment', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;

    const env = loadEnv();
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key');
    expect(env.EXPO_PUBLIC_SENTRY_DSN).toBeUndefined();
  });

  it('accepts an optional Sentry DSN', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o1.ingest.sentry.io/1';

    expect(loadEnv().EXPO_PUBLIC_SENTRY_DSN).toBe('https://abc@o1.ingest.sentry.io/1');
  });

  it('treats an empty Sentry DSN as unset', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.EXPO_PUBLIC_SENTRY_DSN = '';

    expect(loadEnv().EXPO_PUBLIC_SENTRY_DSN).toBeUndefined();
  });

  it('throws when the Supabase URL is missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    expect(() => loadEnv()).toThrow();
  });

  it('throws when the Supabase URL is not a URL', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'not-a-url';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    expect(() => loadEnv()).toThrow();
  });

  it('throws when the anon key is empty', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = '';

    expect(() => loadEnv()).toThrow();
  });
});

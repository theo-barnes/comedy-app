jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
}));

import * as Sentry from '@sentry/react-native';

const mockEnv: { EXPO_PUBLIC_SENTRY_DSN?: string } = {};
jest.mock('@/lib/env', () => ({ env: mockEnv }));

const { initSentry } = jest.requireActual('@/lib/sentry') as typeof import('@/lib/sentry');

const mockInit = Sentry.init as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  delete mockEnv.EXPO_PUBLIC_SENTRY_DSN;
});

describe('initSentry', () => {
  it('does nothing when no DSN is configured', () => {
    initSentry();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('initializes with PII disabled when a DSN is configured', () => {
    mockEnv.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o1.ingest.sentry.io/1';

    initSentry();

    expect(mockInit).toHaveBeenCalledTimes(1);
    const options = mockInit.mock.calls[0][0];
    expect(options.dsn).toBe('https://abc@o1.ingest.sentry.io/1');
    expect(options.sendDefaultPii).toBe(false);
  });

  it('scrubs user PII and request data from events', () => {
    mockEnv.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o1.ingest.sentry.io/1';
    initSentry();
    const { beforeSend } = mockInit.mock.calls[0][0];

    const event = beforeSend({
      user: { id: 'u1', email: 'jo@example.com', username: 'jo', ip_address: '1.2.3.4' },
      request: { url: 'https://api?token=secret' },
    });

    expect(event.user).toEqual({ id: 'u1' });
    expect(event.request).toBeUndefined();
  });

  it('passes through events without user or request blocks', () => {
    mockEnv.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o1.ingest.sentry.io/1';
    initSentry();
    const { beforeSend } = mockInit.mock.calls[0][0];

    const event = beforeSend({ message: 'boom' });
    expect(event).toEqual({ message: 'boom' });
  });

  it('drops console breadcrumbs and keeps the rest', () => {
    mockEnv.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@o1.ingest.sentry.io/1';
    initSentry();
    const { beforeBreadcrumb } = mockInit.mock.calls[0][0];

    expect(beforeBreadcrumb({ category: 'console', message: 'token=abc' })).toBeNull();
    expect(beforeBreadcrumb({ category: 'navigation', message: '/home' })).toEqual({
      category: 'navigation',
      message: '/home',
    });
  });
});

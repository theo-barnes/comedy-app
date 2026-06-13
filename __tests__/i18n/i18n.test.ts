jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

import { getLocales } from 'expo-localization';

const mockGetLocales = getLocales as jest.Mock;

// jest.setup.ts globally mocks @/i18n for component tests.
// This suite validates the real i18n bootstrap and language detection logic.
jest.unmock('@/i18n');

type I18nInstance = typeof import('@/i18n').default;

// function loadI18n(): I18nInstance {
//   let instance: I18nInstance;
//   jest.isolateModules(() => {
//     // eslint-disable-next-line @typescript-eslint/no-require-imports
//     instance = require('@/i18n').default;
//   });
//   return instance!;
// }

// function loadI18n(): I18nInstance {
//   jest.resetModules();

//   // ensure mocks are already applied BEFORE this call
//   // eslint-disable-next-line @typescript-eslint/no-require-imports
//   return require('@/i18n').default;
// }

function loadI18n(): I18nInstance {
  jest.resetModules();

  jest.doMock('expo-localization', () => ({
    getLocales: mockGetLocales,
  }));

  // import AFTER mocks are applied
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/i18n').default;
}

describe('i18n language detection', () => {
  it('uses an exactly supported language tag', () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'en-US', languageCode: 'en' }]);
    expect(loadI18n().language).toBe('en-US');
  });

  it('falls back to the bare language code for regional variants', () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'fr-CA', languageCode: 'fr' }]);
    expect(loadI18n().language).toBe('fr');
  });

  it('walks the device locale list until a supported one is found', () => {
    mockGetLocales.mockReturnValue([
      { languageTag: 'ja-JP', languageCode: 'ja' },
      { languageTag: 'de-DE', languageCode: 'de' },
    ]);
    expect(loadI18n().language).toBe('de');
  });

  it('defaults to English when nothing matches', () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'ja-JP', languageCode: 'ja' }]);
    expect(loadI18n().language).toBe('en');
  });

  it('resolves translations for the detected language', () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'en-US', languageCode: 'en' }]);
    const i18n = loadI18n();
    const message = i18n.t('common.error');
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toBe('common.error');
  });
});

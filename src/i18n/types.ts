import type en from './locales/en.json';

/**
 * Merges the shape of en.json into i18next's type system so that t() is
 * fully typed. Unknown keys produce a TypeScript error at compile time.
 *
 * Usage: import { useTranslation } from 'react-i18next';
 *        const { t } = useTranslation();
 *        t('events.title')       ✓
 *        t('events.typo')        ✗ TS error
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}

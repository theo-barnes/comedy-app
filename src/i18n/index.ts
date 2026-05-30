import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import enUS from './locales/en-US.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

/**
 * Determine the best supported language from the device's ordered locale list.
 * Falls back through: specific tag (en-US) → language code (en) → 'en'.
 */
function detectLanguage(): string {
  const supported = ['en-US', 'en', 'fr', 'de'];
  const deviceLocales = getLocales();

  for (const locale of deviceLocales) {
    if (supported.includes(locale.languageTag)) return locale.languageTag;
    if (locale.languageCode && supported.includes(locale.languageCode)) {
      return locale.languageCode;
    }
  }
  return 'en';
}

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  lng: detectLanguage(),
  fallbackLng: {
    'en-US': ['en'],
    default: ['en'],
  },
  resources: {
    en: { translation: en },
    'en-US': { translation: enUS },
    fr: { translation: fr },
    de: { translation: de },
  },
  interpolation: {
    // React already escapes output — no need for i18next to double-escape
    escapeValue: false,
  },
});

export default i18n;

import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**'],
  },
  expoConfig,
  {
    // eslint-plugin-react@7.x uses the deprecated context.getFilename() API
    // which was removed in ESLint 10. Setting version explicitly skips auto-detection.
    settings: {
      react: { version: '19' },
    },
  },
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // False positive on component factory functions and HOCs in modern React.
      'react/display-name': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
]);
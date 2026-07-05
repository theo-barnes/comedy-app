import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**', '**/.venv/**', 'ios/**'],
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
      // Stray logs leak data and noise into release builds — route diagnostics
      // through the error-reporting layer instead.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Tests may use console output and looser typing for mocks. Jest's
    // module-mock hoisting also requires mocks before imports and `typeof
    // import()` annotations for lazily-required modules.
    files: ['__tests__/**/*.{ts,tsx}', 'jest.setup.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'import/first': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
      ],
    },
  },
]);
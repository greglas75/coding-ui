import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist',
    'e2e',
    'coverage',
    'node_modules',
    'backups',
    'backup',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ]),
  // Special rule: Allow console in logger.ts (it's a logger!)
  {
    files: ['src/utils/logger.ts'],
    rules: {
      'no-console': 'off', // Logger MUST use console
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['e2e/**', 'src/test/**', '**/__tests__/**', 'src/utils/logger.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Relax some rules for existing codebase
      '@typescript-eslint/no-explicit-any': 'warn', // warn instead of error
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'react-hooks/exhaustive-deps': 'warn', // warn instead of error
      'react-refresh/only-export-components': 'warn', // warn instead of error
      '@typescript-eslint/no-empty-object-type': 'off', // allow empty interfaces

      // Performance & Security: Prevent console.log in production
      'no-console': ['error', { allow: ['warn', 'error'] }], // Only allow console.warn and console.error
    },
  },
]);

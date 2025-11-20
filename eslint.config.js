import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'e2e/**',
      'coverage/**',
      'node_modules/**',
      'backups/**',
      'backup/**',
      'playwright-report/**',
      'test-results/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
      // Ignore root-level JS files (Node.js server files)
      '*.js',
      '*.cjs',
      '*.mjs',
      // Ignore specific directories
      'lib/**',
      'utils/**',
      'middleware/**',
      'routes/**',
      'services/**',
      'server/**',
      'scripts/**',
      'python-service/**',
    ],
  },
  // Base config for src/ TS/TSX files only
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Relax some rules for existing codebase
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // Special rule: Allow console in logger.ts (it's a logger!)
  {
    files: ['src/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

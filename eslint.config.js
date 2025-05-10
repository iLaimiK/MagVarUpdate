import eslint from 'eslint';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default [
  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**', 'artifact/**', 'slash-runner/**', 'example_src/dist/**']
  },

  // Base configuration for all JavaScript files
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    ignores: ['**/*.config.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
      }
    },
    plugins: {
      prettier: prettier
    },
    rules: {
      // Basic rules
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-duplicate-imports': 'error',
      'prettier/prettier': 'error'
    }
  },

  // TypeScript specific configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        process: 'readonly',
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: prettier
    },
    rules: {
      // Basic rules
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-duplicate-imports': 'error',

      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-empty-function': 'warn',
      'prettier/prettier': 'error'
    }
  }
];

// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/drizzle/**',
      '**/*.config.{js,mjs,cjs,ts}',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Apps must never import the raw, un-scoped DB pool. The only legitimate DB
  // handle in application code is a TenantContext from @tradepilot/db.
  {
    files: ['apps/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tradepilot/db/src/client/*', '**/client/pool'],
              message:
                'Do not import the raw DB pool. Use a TenantContext (runInTenant / resolveTenantContext) so every query is tenant-scoped.',
            },
          ],
        },
      ],
    },
  },
)

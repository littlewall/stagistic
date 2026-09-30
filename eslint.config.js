import config from '@stagistic/linters/eslint';

export default [
    {ignores: [
        '**/node_modules/**',
        '**/sanity.types.ts',
        'packages/db/src/migrations.compiled.ts',
    ]}, ...config,
];

import config from '@stagistic/linters/eslint';

export default [
    {ignores: [
        '**/node_modules/**',
        'packages/db/src/migrations.compiled.ts',
    ]},
    ...config,
];

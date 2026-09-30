import config from '@stagistic/linters/eslint';

export default [
    {ignores: [
        '**/node_modules/**',
        'packages/db/src/pglite/migrations.compiled.ts',
        // tsc -b build artifacts of the root TS configs (gitignored).
        'vite.config.js',
        'oxlint.config.js',
    ]},
    ...config,
];

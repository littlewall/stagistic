import {defineConfig} from 'oxfmt';

export default defineConfig({
    arrowParens: 'avoid',
    bracketSameLine: false,
    bracketSpacing: false,
    endOfLine: 'lf',
    experimentalOperatorPosition: 'end',
    // migrations.compiled.ts is generated; db:db-check-migrations compares it byte-for-byte.
    ignorePatterns: ['**/*.d.ts', '**/*.d.mts', '**/build/**', '**/dist/**', 'packages/db/src/migrations.compiled.ts'],
    insertFinalNewline: true,
    jsxSingleQuote: false,
    objectWrap: 'preserve',
    printWidth: 160,
    quoteProps: 'as-needed',
    semi: true,
    singleAttributePerLine: false,
    singleQuote: true,
    sortImports: {
        customGroups: [
            {
                elementNamePattern: ['node:*'],
                groupName: 'node-builtins',
            },
        ],
        groups: [
            ['side_effect', 'side_effect_style'],
            'node-builtins',
            ['builtin', 'external'],
            ['internal', 'subpath'],
            ['parent', 'sibling', 'index'],
            'style',
            'unknown',
        ],
        ignoreCase: true,
        newlinesBetween: true,
        order: 'asc',
        partitionByComment: false,
        partitionByNewline: false,
        sortSideEffects: false,
    },
    sortPackageJson: false,
    tabWidth: 4,
    trailingComma: 'all',
    useTabs: false,
});

/*
 * Formatting-only ESLint config, adapted from @dvdevcz/eslint
 * (https://github.com/digitalvisioncz/project-linters/tree/main/packages/eslint).
 * Correctness rules live in oxlint; this config carries only @stylistic and
 * import sorting, so it needs no type information and runs fast with --fix.
 */
import stylistic from '@stylistic/eslint-plugin';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import {parser} from 'typescript-eslint';

import jsxRules from './jsx.js';
import lineBreakRules from './lineBreaks.js';
import spacingRules from './spacing.js';

const config = [
    {ignores: [
        '**/build/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/*.d.mts',
    ]},
    {
        name: '@stagistic/linters/eslint/base',
        files: ['**/*.{ts,tsx,js,jsx,mjs,cjs,mts}'],
        languageOptions: {
            parser,
            parserOptions: {ecmaFeatures: {jsx: true}},
        },
        linterOptions: {
            // oxlint owns eslint-disable comments for non-stylistic rules.
            reportUnusedDisableDirectives: 'off',
        },
        plugins: {
            '@stylistic': stylistic,
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            ...spacingRules,
            ...lineBreakRules,

            '@stylistic/arrow-parens': ['error', 'as-needed'],
            '@stylistic/brace-style': ['error', '1tbs'],
            '@stylistic/comma-dangle': ['error', 'always-multiline'],
            '@stylistic/comma-style': ['error', 'last'],
            '@stylistic/dot-location': ['error', 'property'],
            '@stylistic/indent': ['error', 4],
            '@stylistic/max-len': [
                'error', {
                    code: 160,
                    ignoreComments: true,
                    ignoreStrings: true,
                    ignoreTrailingComments: true,
                    ignoreRegExpLiterals: true,
                },
            ],
            '@stylistic/max-statements-per-line': ['error', {max: 1}],
            '@stylistic/member-delimiter-style': [
                'error', {
                    multiline: {
                        delimiter: 'comma',
                        requireLast: true,
                    },
                    singleline: {
                        delimiter: 'comma',
                        requireLast: false,
                    },
                    multilineDetection: 'brackets',
                },
            ],
            '@stylistic/new-parens': 'error',
            '@stylistic/no-confusing-arrow': ['error', {onlyOneSimpleParam: true}],
            '@stylistic/no-extra-parens': [
                'error',
                'all',
                {
                    conditionalAssign: false,
                    nestedBinaryExpressions: false,
                    ignoreJSX: 'all',
                    ignoredNodes: ['ArrowFunctionExpression[body.type="ConditionalExpression"]'],
                },
            ],
            '@stylistic/no-extra-semi': 'error',
            '@stylistic/no-floating-decimal': 'error',
            '@stylistic/no-mixed-operators': [
                'error', {
                    groups: [
                        ['%', '**'],
                        ['%', '+'],
                        ['%', '-'],
                        ['%', '*'],
                        ['%', '/'],
                        ['/', '*'],
                        [
                            '&',
                            '|',
                            '<<',
                            '>>',
                            '>>>',
                        ],
                        [
                            '==',
                            '!=',
                            '===',
                            '!==',
                        ],
                        ['&&', '||'],
                    ],
                    allowSamePrecedence: false,
                },
            ],
            '@stylistic/no-multiple-empty-lines': ['error', {max: 1}],
            '@stylistic/padded-blocks': ['error', 'never'],
            '@stylistic/quote-props': ['error', 'as-needed'],
            '@stylistic/quotes': ['error', 'single'],
            '@stylistic/semi': [
                'error',
                'always',
                {omitLastInOneLineBlock: true},
            ],
            '@stylistic/semi-style': ['error', 'last'],
            '@stylistic/wrap-regex': 'error',

            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
        },
    },
    {
        name: '@stagistic/linters/eslint/jsx',
        files: ['**/*.{jsx,tsx}'],
        rules: jsxRules,
    },
];

export default config;

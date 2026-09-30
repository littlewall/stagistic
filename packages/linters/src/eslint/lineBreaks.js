const lineBreaks = {
    '@stylistic/array-bracket-newline': [
        'error',
        {
            multiline: true,
        },
    ],
    '@stylistic/array-element-newline': [
        'error',
        {
            consistent: true,
            multiline: true,
            minItems: 3,
        },
    ],
    '@stylistic/function-call-argument-newline': ['error', 'consistent'],
    '@stylistic/function-paren-newline': ['error', 'multiline-arguments'],
    '@stylistic/implicit-arrow-linebreak': ['error', 'beside'],
    '@stylistic/linebreak-style': ['error', 'unix'],
    '@stylistic/lines-between-class-members': ['error', 'always'],
    '@stylistic/multiline-comment-style': ['error', 'starred-block'],
    '@stylistic/newline-per-chained-call': ['error', {ignoreChainWithDepth: 3}],
    '@stylistic/object-curly-newline': [
        'error',
        {
            consistent: true,
            minProperties: 3,
        },
    ],
    '@stylistic/object-property-newline': ['error', {allowAllPropertiesOnSameLine: true}],
    '@stylistic/padding-line-between-statements': [
        'error',
        {
            blankLine: 'always',
            prev: '*',
            next: 'return',
        },
        {
            blankLine: 'always',
            prev: ['const', 'let'],
            next: '*',
        },
        {
            blankLine: 'always',
            prev: '*',
            next: ['const', 'let'],
        },
        {
            blankLine: 'any',
            prev: ['const', 'let'],
            next: ['const', 'let'],
        },
        {
            blankLine: 'always',
            prev: [
                'if',
                'for',
                'while',
                'switch',
                'class',
            ],
            next: '*',
        },
        {
            blankLine: 'always',
            prev: 'directive',
            next: '*',
        },
        {
            blankLine: 'any',
            prev: 'directive',
            next: 'directive',
        },
    ],
};

export default lineBreaks;

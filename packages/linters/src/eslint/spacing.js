const spacingRules = {
    '@stylistic/array-bracket-spacing': ['error', 'never'],
    '@stylistic/arrow-spacing': [
        'error',
        {
            before: true,
            after: true,
        },
    ],
    '@stylistic/block-spacing': ['error', 'never'],
    '@stylistic/comma-spacing': [
        'error',
        {
            before: false,
            after: true,
        },
    ],
    '@stylistic/computed-property-spacing': ['error', 'never'],
    '@stylistic/function-call-spacing': ['error', 'never'],
    '@stylistic/generator-star-spacing': [
        'error',
        {
            before: false,
            after: true,
        },
    ],
    '@stylistic/key-spacing': [
        'error',
        {
            beforeColon: false,
            afterColon: true,
        },
    ],
    '@stylistic/keyword-spacing': [
        'error',
        {
            before: true,
            after: true,
        },
    ],
    '@stylistic/no-mixed-spaces-and-tabs': 'error',
    '@stylistic/no-multi-spaces': 'error',
    '@stylistic/no-trailing-spaces': 'error',
    '@stylistic/no-whitespace-before-property': 'error',
    '@stylistic/object-curly-spacing': ['error', 'never'],
    '@stylistic/rest-spread-spacing': ['error', 'never'],
    '@stylistic/space-before-blocks': 'error',
    '@stylistic/space-before-function-paren': [
        'error',
        {
            anonymous: 'never',
            named: 'never',
            asyncArrow: 'always',
        },
    ],
    '@stylistic/space-in-parens': ['error', 'never'],
    '@stylistic/space-infix-ops': 'error',
    '@stylistic/space-unary-ops': 'error',
    '@stylistic/spaced-comment': [
        'error',
        'always',
        {exceptions: ['-']},
    ],
    '@stylistic/switch-colon-spacing': 'error',
    '@stylistic/template-curly-spacing': 'error',
    '@stylistic/template-tag-spacing': 'error',
    '@stylistic/type-annotation-spacing': 'error',
    '@stylistic/type-generic-spacing': 'error',
    '@stylistic/type-named-tuple-spacing': 'error',
    '@stylistic/yield-star-spacing': ['error', 'after'],
};

export default spacingRules;

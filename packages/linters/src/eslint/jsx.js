// JSX stylistic rules. React correctness rules (react/*) are covered by oxlint.
const jsxRules = {
    '@stylistic/jsx-child-element-spacing': 'off',
    '@stylistic/jsx-closing-bracket-location': ['error', 'line-aligned'],
    '@stylistic/jsx-closing-tag-location': 'error',
    '@stylistic/jsx-curly-brace-presence': [
        'error',
        {
            props: 'never',
            children: 'never',
            propElementValues: 'always',
        },
    ],
    '@stylistic/jsx-curly-newline': [
        'error',
        {
            multiline: 'consistent',
            singleline: 'consistent',
        },
    ],
    '@stylistic/jsx-curly-spacing': ['error', {when: 'never'}],
    '@stylistic/jsx-equals-spacing': ['error', 'never'],
    '@stylistic/jsx-first-prop-new-line': ['error', 'multiline'],
    '@stylistic/jsx-function-call-newline': ['error', 'multiline'],
    '@stylistic/jsx-indent-props': ['error', 4],
    '@stylistic/jsx-max-props-per-line': ['error', {maximum: 1, when: 'multiline'}],
    '@stylistic/jsx-quotes': ['error', 'prefer-double'],
    '@stylistic/jsx-self-closing-comp': [
        'error',
        {
            component: true,
            html: false,
        },
    ],
    '@stylistic/jsx-tag-spacing': [
        'error',
        {
            closingSlash: 'never',
            beforeSelfClosing: 'always',
            afterOpening: 'never',
            beforeClosing: 'never',
        },
    ],
    '@stylistic/jsx-wrap-multilines': [
        'error',
        {
            declaration: 'parens-new-line',
            assignment: 'parens-new-line',
            return: 'parens-new-line',
            arrow: 'parens-new-line',
            condition: 'parens-new-line',
            logical: 'parens-new-line',
            prop: 'parens-new-line',
        },
    ],
};

export default jsxRules;

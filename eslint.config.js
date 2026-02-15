import dvdevEslint from '@dvdevcz/eslint';

export default [
    ...dvdevEslint.configs.base,
    ...dvdevEslint.configs.react,
    {
        name: 'stagistic/style-guardrails',
        files: ['apps/**/*.{ts,tsx,js,jsx}', 'packages/**/*.{ts,tsx,js,jsx}'],
        rules: {
            curly: ['error', 'all'],
            'func-style': ['error', 'expression', {allowArrowFunctions: true}],
            'no-else-return': ['error', {allowElseIf: false}],
            'no-negated-condition': 'error',
            'no-nested-ternary': 'error',
            'prefer-arrow-callback': ['error', {allowNamedFunctions: false}],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'IfStatement[alternate!=null]',
                    message: 'Avoid else/else-if and use early returns or guard clauses.',
                },
                {
                    selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral",
                    message: 'Use clsx() for dynamic className composition.',
                },
                {
                    selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > BinaryExpression",
                    message: 'Use clsx() for dynamic className composition.',
                },
                {
                    selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > ConditionalExpression",
                    message: 'Use clsx() for dynamic className composition.',
                },
                {
                    selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > LogicalExpression",
                    message: 'Use clsx() for dynamic className composition.',
                },
            ],
        },
    },
];

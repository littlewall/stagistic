export default {
    extends: ['@dvdevcz/stylelint'],
    ignoreFiles: ['**/dist/**'],
    rules: {
        'csstree/validator': {
            properties: {
                content: '| attr( <custom-ident> )',
                width: '| <min()> | <max()> | <clamp()>',
                padding: '| <min()> | <max()> | <clamp()>',
                'font-size': '| <min()> | <max()> | <clamp()>',
            },
            ignoreProperties: [
                'composes',
                'scrollbar-width',
                'anchor-name',
                'position-anchor',
                'text-wrap',
            ],
            ignoreValue: '\\b(?:oklch|anchor|anchor-size)\\(',
        },
        'custom-property-empty-line-before': null,
    },
};

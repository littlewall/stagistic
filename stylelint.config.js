export default {
    extends: ['@dvdevcz/stylelint'],
    ignoreFiles: ['**/dist/**'],
    rules: {
        'csstree/validator': {
            // Preset's syntax patches, kept verbatim (overriding the rule replaces them).
            properties: {
                content: '| attr( <custom-ident> )',
                width: '| <min()> | <max()> | <clamp()>',
                padding: '| <min()> | <max()> | <clamp()>',
                'font-size': '| <min()> | <max()> | <clamp()>',
            },
            /*
             * Modern CSS the bundled css-tree syntax DB doesn't know yet:
             * CSS Anchor Positioning and text-wrap.
             */
            ignoreProperties: [
                'composes',
                'scrollbar-width',
                'anchor-name',
                'position-anchor',
                'text-wrap',
            ],
            // oklch() colors and anchor() positioning values.
            ignoreValue: '\\b(?:oklch|anchor|anchor-size)\\(',
        },
        // Blank lines intentionally group related tokens (packages/ui/styles/tokens.css).
        'custom-property-empty-line-before': null,
    },
};

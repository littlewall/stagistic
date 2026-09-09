import base from './stylelint/base.js';
import guards from './stylelint/guards.js';

export default {
    ...base,
    /*
     * Not [...base.ignoreFiles, …]: with `extends`, stylelint let the local
     * ignoreFiles replace the inherited list outright rather than merging, so
     * the package's JS/TS patterns were never in effect here. Reproducing that
     * exactly is what keeps this move an ownership change and nothing more.
     */
    ignoreFiles: ['**/dist/**'],
    rules: {
        ...base.rules,
        'csstree/validator': {
            properties: {
                content: '| attr( <custom-ident> )',
                width: '| <min()> | <max()> | <clamp()>',
                padding: '| <min()> | <max()> | <clamp()>',
                'font-size': '| <min()> | <max()> | <clamp()>',
                'max-height': '| <min()> | <max()> | <clamp()>',
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
    overrides: guards.overrides,
};

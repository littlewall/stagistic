import base from '@stagistic/linters/stylelint/base';
import guards from '@stagistic/linters/stylelint/guards';

export default {
    ...base,
    // Build output and local design prototypes are not product CSS.
    ignoreFiles: [
        '**/dist/**',
        '**/target/**',
        'docs/designs/**',
    ],
    rules: {
        ...base.rules,
        'custom-property-empty-line-before': null,
    },
    overrides: guards.overrides,
};

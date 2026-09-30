import base from '@stagistic/linters/stylelint/base';
import guards from '@stagistic/linters/stylelint/guards';

export default {
    ...base,
    ignoreFiles: ['**/dist/**'],
    rules: {
        ...base.rules,
        'custom-property-empty-line-before': null,
    },
    overrides: guards.overrides,
};

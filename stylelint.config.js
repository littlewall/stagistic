import base from '@stagistic/stylelint-config/base';
import guards from '@stagistic/stylelint-config/guards';

export default {
    ...base,
    ignoreFiles: ['**/dist/**'],
    rules: {
        ...base.rules,
        'custom-property-empty-line-before': null,
    },
    overrides: guards.overrides,
};

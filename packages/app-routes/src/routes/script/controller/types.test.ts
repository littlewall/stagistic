import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {isEditorSettingsOverrideEmpty} from './types';

describe('isEditorSettingsOverrideEmpty', () => {
    it('treats header and footer settings as persisted content', () => {
        expect(isEditorSettingsOverrideEmpty({
            headerFooter: {
                header: {right: {text: '{{page}}'}},
            },
        })).toBe(false);
    });
});

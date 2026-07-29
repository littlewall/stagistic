import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildDefaultBlockSettings} from './defaultBlockSettings';

describe('buildDefaultBlockSettings', () => {
    it('positions character cues at the screenplay default shown in the element preview', () => {
        expect(buildDefaultBlockSettings().character).toMatchObject({
            indentLeftChars: 20,
            indentRightChars: 3,
        });
    });
});

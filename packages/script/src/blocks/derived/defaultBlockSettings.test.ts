import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildDefaultBlockSettings} from './defaultBlockSettings';

describe('buildDefaultBlockSettings', () => {
    it('makes acts a stronger structural break than scenes by default', () => {
        const defaults = buildDefaultBlockSettings();

        expect(defaults.act).toMatchObject({
            spacingBeforeEm: 2,
            spacingAfterEm: 1,
            textAlign: 'center',
            isBold: true,
            isUnderline: true,
        });
        expect(defaults.scene).toMatchObject({
            spacingBeforeEm: 1,
            textAlign: 'left',
            isBold: true,
            isUnderline: true,
        });
    });

    it('positions character cues at the screenplay default shown in the element preview', () => {
        expect(buildDefaultBlockSettings().character).toMatchObject({
            indentLeftChars: 20,
            indentRightChars: 3,
        });
    });
});

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {isInScriptPath} from './menuContext';

describe('menu context', () => {
    it.each([
        '/script/s1/editor',
        '/script/s1/board/wall',
        '/script/s1/board',
        '/script/s1/export',
        '/script/s1/snapshots/d1/editor',
        '/script/s1/snapshots/d1/export',
    ])('is in a script on %s', pathname => {
        expect(isInScriptPath(pathname)).toBe(true);
    });

    it.each([
        '/',
        '/script/s1',
        '/script/s1/settings',
        '/script/s1/editors',
        '/script//editor',
        '/other/script/s1/editor',
    ])('is not in a script on %s', pathname => {
        expect(isInScriptPath(pathname)).toBe(false);
    });
});

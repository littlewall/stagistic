import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseDeepLink} from './deepLink';

describe('parseDeepLink', () => {
    it('parses valid deep link with script and blockId', () => {
        const result = parseDeepLink('stagistic://script/s1/editor?block=blk-123');

        expect(result).toEqual({
            scriptId: 's1',
            blockId: 'blk-123',
        });
    });

    it('parses deep link with sceneId', () => {
        const result = parseDeepLink('stagistic://script/s_abc/editor?scene=sc-45');

        expect(result).toEqual({
            scriptId: 's_abc',
            sceneId: 'sc-45',
        });
    });

    it('parses deep link with both blockId and sceneId', () => {
        const result = parseDeepLink('stagistic://script/s1/editor?block=blk-1&scene=sc-1');

        expect(result).toEqual({
            scriptId: 's1',
            blockId: 'blk-1',
            sceneId: 'sc-1',
        });
    });

    it('parses deep link without query params', () => {
        const result = parseDeepLink('stagistic://script/s1/editor');

        expect(result).toEqual({
            scriptId: 's1',
        });
    });

    it('rejects invalid protocol', () => {
        expect(parseDeepLink('https://script/s1/editor?block=blk-123')).toBeNull();
    });

    it('rejects malformed URLs', () => {
        expect(parseDeepLink('not-a-url')).toBeNull();
        expect(parseDeepLink('stagistic://other/s1')).toBeNull();
        expect(parseDeepLink('stagistic://script/')).toBeNull();
    });
});

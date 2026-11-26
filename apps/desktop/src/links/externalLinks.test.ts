import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {externalUrlFor} from './externalLinks';

const base = 'tauri://localhost/script/1';
const origin = 'tauri://localhost';

describe('externalUrlFor', () => {
    it('returns https links to other origins', () => {
        expect(externalUrlFor('https://feedback.stagistic.com', base, origin)).toBe('https://feedback.stagistic.com/');
    });

    it('ignores in-app, hash and non-web links', () => {
        expect(externalUrlFor('/script/2', base, origin)).toBeNull();
        expect(externalUrlFor('#top', base, origin)).toBeNull();
        expect(externalUrlFor('mailto:a@b.cz', base, origin)).toBeNull();
        expect(externalUrlFor('blob:tauri://localhost/x', base, origin)).toBeNull();
    });
});

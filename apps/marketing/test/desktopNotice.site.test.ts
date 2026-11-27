import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {isReleaseNumber} from '@stagistic/release-notes';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const marketingRoot = fileURLToPath(new URL('../', import.meta.url));

describe('Mac app manual update notice', () => {
    it('serves /desktop/notice.json with the expected shape', () => {
        const file = `${marketingRoot}dist/desktop/notice.json`;

        expect(existsSync(file)).toBe(true);

        const notice = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

        expect(typeof notice.minimumRelease).toBe('string');
        expect(isReleaseNumber(notice.minimumRelease as string)).toBe(true);
        expect(notice.minimumRelease).toBe('1.0.0');
    });

    it('is never cached and readable from the app webview', () => {
        const headers = readFileSync(`${marketingRoot}dist/_headers`, 'utf8');
        const rule = (/^\/desktop\/notice\.json\n((?: {2,}.+\n?)+)/m).exec(headers)?.[1] ?? '';

        expect(rule).toContain('Cache-Control: no-store');
        expect(rule).toContain('Access-Control-Allow-Origin: *');
    });
});

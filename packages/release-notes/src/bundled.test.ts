import {readFileSync} from 'node:fs';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {currentReleaseNumber, releases} from './bundled';
import {compareReleaseNumbers, isReleaseNumber} from './index';

describe('bundled Releases', () => {
    it('loads the finished Releases of the repository newest first', () => {
        for (let index = 1; index < releases.length; index++) {
            expect(compareReleaseNumbers(releases[index - 1].release, releases[index].release)).toBeGreaterThan(0);
        }
    });

    it('takes the current Release number from the root package.json', () => {
        const root = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {version: string};

        expect(currentReleaseNumber).toBe(root.version);
        expect(isReleaseNumber(currentReleaseNumber)).toBe(true);
    });
});

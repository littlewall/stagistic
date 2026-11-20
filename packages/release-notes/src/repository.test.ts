import {
    existsSync,
    readdirSync,
    readFileSync,
} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {listReleases, parseFragment} from './index';
import {readReleaseNumbers} from './node';

const root = fileURLToPath(new URL('../../../', import.meta.url));

const markdownIn = (dir: string): Record<string, string> => {
    const path = join(root, dir);

    if (!existsSync(path)) {
        return {};
    }

    return Object.fromEntries(
        readdirSync(path)
            .filter(entry => entry.endsWith('.md'))
            .map(name => [`${dir}/${name}`, readFileSync(join(path, name), 'utf8')]),
    );
};

describe('this repository', () => {
    it('keeps one Release number in every package.json, tauri.conf.json and Cargo file', () => {
        const numbers = readReleaseNumbers(root);

        expect(numbers.length).toBeGreaterThan(5);
        expect(new Set(numbers.map(entry => entry.version)), JSON.stringify(numbers)).toHaveProperty('size', 1);
    });

    it('holds only valid finished Releases', () => {
        expect(() => listReleases(markdownIn('releases'))).not.toThrow();
    });

    it('holds only valid fragments', () => {
        for (const [file, source] of Object.entries(markdownIn('releases/next'))) {
            expect(() => parseFragment(source, file)).not.toThrow();
        }
    });
});

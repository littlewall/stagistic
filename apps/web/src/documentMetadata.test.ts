import {execFileSync} from 'node:child_process';
import {
    existsSync,
    readFileSync,
} from 'node:fs';

import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

describe('web document metadata', () => {
    let html = '';

    beforeAll(() => {
        execFileSync(
            'pnpm',
            [
                '--filter',
                '@stagistic/web',
                'build',
            ],
            {
                cwd: new URL('../../..', import.meta.url),
                stdio: 'pipe',
            },
        );
        html = readFileSync(
            new URL('../dist/index.html', import.meta.url),
            'utf8',
        );
    });

    it('exposes the complete editor favicon set and base title', () => {
        expect(html).toContain('<title>Stagistic Editor</title>');
        expect(html).toContain(
            '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
        );
        expect(html).toContain(
            '<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />',
        );
        expect(html).toContain(
            '<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />',
        );
        expect(html).toContain('<link rel="shortcut icon" href="/favicon.ico" />');
        expect(html).toContain(
            '<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />',
        );
        expect(html).toContain(
            '<meta name="theme-color" content="#3d2a1d" />',
        );
    });

    it('ships every favicon file declared by the document', () => {
        const faviconPaths = [
            '../dist/favicon.svg',
            '../dist/favicon-16x16.png',
            '../dist/favicon-32x32.png',
            '../dist/favicon.ico',
            '../dist/apple-touch-icon.png',
        ];

        faviconPaths.forEach(faviconPath => {
            expect(existsSync(new URL(faviconPath, import.meta.url))).toBe(true);
        });
    });
});

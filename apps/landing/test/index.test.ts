import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

import {beforeAll, describe, expect, it} from 'vite-plus/test';

describe('landing page', () => {
    let html = '';

    beforeAll(() => {
        execFileSync(
            'pnpm',
            ['--filter', '@stagistic/landing', 'build'],
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

    it('renders an accessible media image for every feature', () => {
        expect(html.match(/data-feature-media/g) ?? []).toHaveLength(6);
        expect(html.match(/data-feature-image/g) ?? []).toHaveLength(6);
        expect(html.match(/data-feature-image[^>]+alt="[^"]+"/g) ?? [])
            .toHaveLength(6);
    });

    it('uses the editor brand line in the footer', () => {
        expect(html).toContain('© Stagistic • Made with 💛 in Prague');
    });

    it('renders container-width dividers around the features section', () => {
        expect(html.match(/data-section-divider/g) ?? []).toHaveLength(2);
    });
});

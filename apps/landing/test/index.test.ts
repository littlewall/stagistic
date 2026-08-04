import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';

import {
    beforeAll, describe, expect, it,
} from 'vite-plus/test';

const readSvgCanvas = (relativePath: string) => {
    const svg = readFileSync(
        new URL(relativePath, import.meta.url),
        'utf8',
    );
    const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';

    return {
        width: root.match(/\bwidth="([^"]+)"/)?.[1],
        height: root.match(/\bheight="([^"]+)"/)?.[1],
        viewBox: root.match(/\bviewBox="([^"]+)"/)?.[1],
    };
};

const readPngDimensions = (relativePath: string) => {
    const png = readFileSync(new URL(relativePath, import.meta.url));

    return [
        png.readUInt32BE(16),
        png.readUInt32BE(20),
    ];
};

const readIcoDimensions = (relativePath: string) => {
    const ico = readFileSync(new URL(relativePath, import.meta.url));
    const imageCount = ico.readUInt16LE(4);

    return Array.from({length: imageCount}, (_, index) => {
        const offset = 6 + index * 16;

        return [
            ico[offset] || 256,
            ico[offset + 1] || 256,
        ];
    });
};

describe('landing page', () => {
    let homeHtml = '';
    let syntaxHtml = '';

    beforeAll(() => {
        execFileSync(
            'pnpm',
            [
                '--filter',
                '@stagistic/landing',
                'build',
            ],
            {
                cwd: new URL('../../..', import.meta.url),
                stdio: 'pipe',
            },
        );
        homeHtml = readFileSync(
            new URL('../dist/index.html', import.meta.url),
            'utf8',
        );
        syntaxHtml = readFileSync(
            new URL('../dist/syntax/index.html', import.meta.url),
            'utf8',
        );
    });

    it('renders an accessible media image for every feature', () => {
        expect(homeHtml.match(/data-feature-media/g) ?? []).toHaveLength(6);
        expect(homeHtml.match(/data-feature-image/g) ?? []).toHaveLength(6);
        expect(homeHtml.match(/data-feature-image[^>]+alt="[^"]+"/g) ?? [])
            .toHaveLength(6);
    });

    it('uses the editor identity in product copy and the umbrella brand in the footer', () => {
        expect(homeHtml).toContain(
            '<title>Stagistic Editor - Script editor built for theatre</title>',
        );
        expect(homeHtml).toContain(
            'Stagistic Editor is a script editor built specifically for',
        );
        expect(homeHtml).toContain('© Stagistic • Made with 💛 in Prague');
    });

    it('renders the editor mark with one uninterrupted wordmark', () => {
        expect(homeHtml).toContain(
            'src="/assets/stagistic-brand/editor-mark-on-dark.svg"',
        );
        expect(homeHtml).toContain('>Stagistic Editor</span>');
        expect(homeHtml).not.toContain('>Editor</span>');
    });

    it('keeps the header navigation focused and exposes the editor action', () => {
        const homeHeader = homeHtml.match(/<header\b[\s\S]*?<\/header>/)
            ?.[0] ?? '';
        const primaryNav = homeHeader.match(/<nav\b[\s\S]*?<\/nav>/)
            ?.[0] ?? '';

        expect(primaryNav.match(/<a\b/g) ?? []).toHaveLength(2);
        expect(primaryNav).toContain('aria-label="Primary"');
        expect(primaryNav).toContain('href="#features"');
        expect(primaryNav).toContain('href="#faq"');
        expect(primaryNav).not.toContain('href="#alpha"');
        expect(homeHeader).not.toContain('Early alpha');
        expect(homeHeader).toContain(
            '<a href="https://editor.stagistic.app" class="_navCta_',
        );
        expect(homeHeader).toContain('>Try editor</a>');
    });

    it('offers a secondary hero action that links to the features section', () => {
        const heroSection = homeHtml.match(
            /<!-- Hero --><section\b[\s\S]*?<\/section>/,
        )?.[0] ?? '';

        expect(heroSection).toContain(
            '<a href="#features" class="_btnOutline_',
        );
        expect(heroSection).toContain('>Explore features</a>');
    });

    it('invites visitors to try the mini editor before the editor island', () => {
        const heroSection = homeHtml.match(
            /<!-- Hero --><section\b[\s\S]*?<\/section>/,
        )?.[0] ?? '';
        const callout = heroSection.match(
            /<div\b[^>]*data-try-editor-callout[\s\S]*?<\/div>/,
        )?.[0] ?? '';
        const calloutIndex = heroSection.indexOf(
            'data-try-editor-callout',
        );
        const editorIndex = heroSection.indexOf(
            'aria-label="Interactive preview of Stagistic Editor"',
        );

        expect(callout).toContain('>Try it!</span>');
        expect(callout).toContain('aria-hidden="true"');
        expect(calloutIndex).toBeGreaterThan(-1);
        expect(editorIndex).toBeGreaterThan(calloutIndex);
    });

    it('promises every Editor feature will remain free', () => {
        expect(homeHtml).toContain(
            'Every current and future Editor feature will remain free.',
        );
        expect(homeHtml).toContain(
            'Some future tools may be paid, but Stagistic Editor will always be free and open source.',
        );
    });

    it('keeps only the back link in the syntax header', () => {
        const syntaxHeader = syntaxHtml.match(/<header\b[\s\S]*?<\/header>/)
            ?.[0] ?? '';

        expect(syntaxHeader).toContain('>Back to site</a>');
        expect(syntaxHeader).not.toContain('Stagistic');
        expect(syntaxHeader).not.toContain('href="/#features"');
        expect(syntaxHtml).toContain('>Stagistic syntax</h1>');
    });

    it('exposes the non-PWA favicon set and browser theme on every page', () => {
        for (const html of [homeHtml, syntaxHtml]) {
            expect(html).toContain(
                '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
            );
            expect(html).toContain(
                '<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">',
            );
            expect(html).toContain(
                '<meta name="theme-color" content="#3d2a1d">',
            );
            expect(html).not.toContain('rel="manifest"');
        }
    });

    it('ships every favicon file declared by the pages', () => {
        const faviconPaths = [
            '../public/favicon.svg',
            '../public/favicon-16x16.png',
            '../public/favicon-32x32.png',
            '../public/favicon.ico',
            '../public/apple-touch-icon.png',
        ];

        for (const faviconPath of faviconPaths) {
            expect(existsSync(new URL(faviconPath, import.meta.url))).toBe(true);
        }
    });

    it('ships the approved editor mark canvas at every icon size', () => {
        const svgPaths = [
            '../public/assets/stagistic-brand/editor-mark-on-light.svg',
            '../public/assets/stagistic-brand/editor-mark-on-dark.svg',
            '../public/favicon.svg',
        ];

        for (const svgPath of svgPaths) {
            expect(readSvgCanvas(svgPath)).toEqual({
                width: '135',
                height: '130',
                viewBox: '0 0 135 130',
            });
        }

        expect(readPngDimensions('../public/favicon-16x16.png'))
            .toEqual([16, 16]);
        expect(readPngDimensions('../public/favicon-32x32.png'))
            .toEqual([32, 32]);
        expect(readPngDimensions('../public/apple-touch-icon.png'))
            .toEqual([180, 180]);
        expect(readIcoDimensions('../public/favicon.ico'))
            .toEqual([
                [16, 16],
                [32, 32],
            ]);
    });

    it('renders container-width dividers around the features section', () => {
        expect(homeHtml.match(/data-section-divider/g) ?? []).toHaveLength(2);
    });
});

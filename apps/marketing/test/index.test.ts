import {
    existsSync,
    readdirSync,
    readFileSync,
} from 'node:fs';

import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

const readSvgCanvas = (relativePath: string) => {
    const svg = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';

    return {
        width: root.match(/\bwidth="([^"]+)"/)?.[1],
        height: root.match(/\bheight="([^"]+)"/)?.[1],
        viewBox: root.match(/\bviewBox="([^"]+)"/)?.[1],
    };
};

const readPngDimensions = (relativePath: string) => {
    const png = readFileSync(new URL(relativePath, import.meta.url));

    return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

const readIcoDimensions = (relativePath: string) => {
    const ico = readFileSync(new URL(relativePath, import.meta.url));
    const imageCount = ico.readUInt16LE(4);

    return Array.from({length: imageCount}, (_, index) => {
        const offset = 6 + index * 16;

        return [ico[offset] || 256, ico[offset + 1] || 256];
    });
};

describe('marketing website', () => {
    let homeHtml = '';
    let homeCss = '';
    let musicalsHtml = '';
    let openSourceHtml = '';
    let playwritingHtml = '';
    let syntaxHtml = '';

    beforeAll(() => {
        homeHtml = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

        const cssPaths = Array.from(homeHtml.matchAll(/<link rel="stylesheet" href="([^"]+\.css)">/g)).map(m => m[1]);

        expect(cssPaths.length).toBeGreaterThan(0);
        homeCss = cssPaths.map(cssPath => readFileSync(new URL(`../dist${cssPath}`, import.meta.url), 'utf8')).join('\n');
        musicalsHtml = readFileSync(new URL('../dist/editor/musicals.html', import.meta.url), 'utf8');
        openSourceHtml = readFileSync(new URL('../dist/open-source.html', import.meta.url), 'utf8');
        playwritingHtml = readFileSync(new URL('../dist/editor/playwriting.html', import.meta.url), 'utf8');
        syntaxHtml = readFileSync(new URL('../dist/editor/syntax.html', import.meta.url), 'utf8');
    });

    it('gives every feature media an accessible name', () => {
        const images = homeHtml.match(/data-feature-image/g) ?? [];
        const videos = homeHtml.match(/data-feature-video/g) ?? [];

        expect(homeHtml.match(/data-feature-media/g) ?? []).toHaveLength(6);
        expect(images.length + videos.length).toBe(6);
        expect(homeHtml.match(/data-feature-image[^>]+alt="[^"]+"/g) ?? []).toHaveLength(images.length);
        expect(homeHtml.match(/data-feature-video[^>]+title="[^"]+"/g) ?? []).toHaveLength(videos.length);
    });

    it('uses the editor identity in product copy and the umbrella brand in the footer', () => {
        expect(homeHtml).toContain('<title>Stagistic Editor - Script editor for theatre and musicals</title>');
        expect(homeHtml).toMatch(/<h1\b[^>]*>A script editor for theatre and musicals\.<\/h1>/);
        expect(homeHtml).toContain('© Stagistic • Made with 💛 in Prague');
    });

    it('states each writing use case with its approved copy', () => {
        const normalize = (html: string) => html.replace(/\s+/g, ' ');

        expect(normalize(homeHtml)).toContain(
            'Write plays and musicals with acts, scenes, characters, dialogue, lyrics, and music cues. Not shots and cuts.',
        );
        expect(normalize(playwritingHtml)).toContain(
            'Acts and scenes are not camera setups. Stagistic Editor keeps your play structured around characters, dialogue, and stage directions without making theatre conform to screenplay logic.',
        );
        expect(normalize(musicalsHtml)).toContain('Your libretto and score belong in the same script.');
        expect(normalize(musicalsHtml)).toContain(
            'Write dialogue and lyrics as distinct parts of the show, manage songs and instrumentals, attach PDF scores to musical numbers, and export the whole production as one paginated document.',
        );
    });

    it('renders the paper Stagistic mark with one uninterrupted wordmark', () => {
        expect(homeHtml).toContain('src="/assets/stagistic-brand/stagistic-mark-on-dark.svg"');
        expect(homeHtml).toContain('>Stagistic Editor</span>');
        expect(homeHtml).not.toContain('>Editor</span>');
    });

    it('keeps the header navigation focused and exposes the editor action', () => {
        const homeHeader = homeHtml.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';
        const primaryNav = homeHeader.match(/<nav\b[\s\S]*?<\/nav>/)?.[0] ?? '';
        const articleDirectory = new URL('../dist/articles/', import.meta.url);
        const hasPublishedArticles = existsSync(articleDirectory) && readdirSync(articleDirectory, {encoding: 'utf8', recursive: true}).some(file => file.endsWith('.html'));

        expect(primaryNav.match(/<a\b/g) ?? []).toHaveLength(hasPublishedArticles ? 5 : 4);
        expect(primaryNav).toContain('aria-label="Primary"');

        const editorMenu = primaryNav.match(/<details\b[^>]*data-editor-menu[\s\S]*?<\/details>/)?.[0] ?? '';

        expect(editorMenu).toMatch(/<summary\b[^>]*>Editor(?:\s|<)/);
        expect(editorMenu).toContain('href="/editor/playwriting"');
        expect(editorMenu).toContain('href="/editor/musicals"');
        expect(primaryNav.includes('href="/articles"')).toBe(hasPublishedArticles);
        expect(primaryNav).toContain('href="/download"');
        expect(primaryNav).toContain('href="https://docs.stagistic.com"');
        expect(primaryNav).toMatch(/<span\b[^>]*aria-hidden="true"[^>]*>↗<\/span>/);
        expect(primaryNav).not.toContain('href="/open-source"');
        expect(primaryNav).not.toContain('href="/editor/syntax"');

        const footer = homeHtml.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';

        expect(footer).toContain('href="/download"');
        expect(footer).toContain('href="/open-source"');
        expect(footer).toContain('href="/editor/syntax"');
        expect(primaryNav).not.toContain('href="#alpha"');
        expect(homeHeader).not.toContain('Early alpha');
        expect(homeHeader).toContain('<a href="https://editor.stagistic.app" class="_navCta_');
        expect(homeHeader).toContain('>Try editor</a>');
    });

    it('puts the trust line and the actions in the hero', () => {
        const heroSection = homeHtml.match(/<!-- Hero --><section\b[\s\S]*?<\/section>/)?.[0] ?? '';

        expect(heroSection).toContain('>Download</a>');
        expect(heroSection.replace(/\s+/g, ' ')).toContain('Free forever · No account · Scripts stay on your computer · Open source');
    });

    it('orders the home page by the approved message', () => {
        const markers = [
            '<h1',
            '>Try in browser</a>',
            'The screenplay problem.',
            '>Write</h3>',
            '>Musicals</h3>',
            '>Plan</h3>',
            '>Format and export</h3>',
            '>Keep</h3>',
            'Common<br>questions.',
            'Stagistic Editor is free.<br>Forever.',
        ];
        const positions = markers.map(marker => homeHtml.indexOf(marker));

        expect(positions.every(position => position > -1)).toBe(true);
        expect(positions).toEqual(positions.toSorted((a, b) => a - b));
        expect(homeHtml.match(/<div\b[^>]*data-system-cta/g) ?? []).toHaveLength(1);
    });

    it('keeps the feature groups text-only where there is no media yet', () => {
        const textOnly = homeHtml.match(/<article\b[^>]*data-text-only[^>]*>[\s\S]*?<\/article>/g) ?? [];

        expect(textOnly.length).toBeGreaterThan(0);

        for (const article of textOnly) {
            expect(article).not.toContain('data-feature-media');
        }
    });

    it('answers about six questions that hold for both Surfaces', () => {
        const faq = homeHtml.match(/<section\b[^>]*id="faq"[\s\S]*?<\/section>/)?.[0] ?? '';

        expect(faq.match(/<details\b/g) ?? []).toHaveLength(6);
    });

    it('keeps MCP, Claude and Windows off the home page', () => {
        const visibleText = homeHtml.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');

        expect(visibleText).not.toMatch(/\bMCP\b|Claude|Windows/i);
    });

    it('links feature descriptions to their specific editor guides', () => {
        const links = Array.from(homeHtml.matchAll(/<a href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/g), ([
            ,
            href,
            label,
        ]) => ({
            href,
            label: label.replace(/&rarr;/g, '→').trim(),
        }));

        expect(links).toEqual(
            expect.arrayContaining([
                {
                    href: '/editor/playwriting',
                    label: 'Explore stage playwriting →',
                },
                {
                    href: '/editor/musicals',
                    label: 'Explore musical theatre writing →',
                },
            ]),
        );
    });

    it('shows the Mac app and offers Download and Try in browser in the hero', () => {
        const heroSection = homeHtml.match(/<!-- Hero --><section\b[\s\S]*?<\/section>/)?.[0] ?? '';

        expect(heroSection).toMatch(/<img\b[^>]*src="\/images\/hero-mac-app\.webp"/);
        expect(heroSection).toContain('alt="Stagistic Editor Mac app with the structure panel and a musical number with lyrics"');
        expect(heroSection).toMatch(/<a href="\/download"[^>]*>Download<\/a>/);
        expect(heroSection).toMatch(/<a href="https:\/\/editor\.stagistic\.app"[^>]*>Try in browser<\/a>/);
        expect(heroSection).not.toContain('data-system-cta');
        expect(heroSection).not.toContain('astro-island');
    });

    it('hides Try in browser below 1000px, where the Web app does not fit', () => {
        expect(homeCss).toMatch(/@media \(width<=62\.4375em\)\{[^@]*\._heroTryInBrowser_[^{]*\{display:none}/);
    });

    it('stacks the hero content on small screens', () => {
        expect(homeCss).toMatch(/@media \(width<=53\.75em\)\{[^@]*\._heroInner_[^{]+\{grid-template-columns:minmax\(0,1fr\)/);
    });

    it('promises every Editor feature will remain free', () => {
        expect(homeHtml).toContain('Every current and future Editor feature will remain free.');
    });

    it('includes the primary nav on the syntax header', () => {
        const syntaxHeader = syntaxHtml.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';

        expect(syntaxHeader).toContain('aria-label="Primary"');
        expect(syntaxHtml).toContain('>Stagistic syntax</h1>');
    });

    it('introduces syntax in one paragraph and links to the full documentation', () => {
        const main = syntaxHtml.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
        const normalizedSyntax = syntaxHtml.replace(/\s+/g, ' ');
        const normalizedOpenSource = openSourceHtml.replace(/\s+/g, ' ');

        expect(main.match(/<p\b/g) ?? []).toHaveLength(1);
        expect(main).toContain('href="https://docs.stagistic.com/syntax/"');
        expect(main).not.toMatch(/<h2\b|<pre\b|<aside\b/);
        expect(normalizedSyntax).toContain('Stagistic Syntax is an open, plain-text format for theatrical plays and musicals.');
        expect(normalizedOpenSource).toContain('runs in your browser or as a Mac app, works without an account and stores scripts locally by default.');
    });

    it('exposes the non-PWA favicon set and browser theme on every page', () => {
        for (const html of [homeHtml, syntaxHtml]) {
            expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
            expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">');
            expect(html).toContain('<meta name="theme-color" content="#1d2327">');
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

    it('ships the approved editor and favicon canvases at every icon size', () => {
        expect(readSvgCanvas('../public/assets/stagistic-brand/stagistic-mark-on-dark.svg')).toEqual({
            width: '120',
            height: '120',
            viewBox: '9.95484 8.87608 94.88736 94.88736',
        });

        expect(readSvgCanvas('../public/favicon.svg')).toEqual({
            width: '120',
            height: '120',
            viewBox: '9.95484 8.87608 94.88736 94.88736',
        });

        expect(readPngDimensions('../public/favicon-16x16.png')).toEqual([16, 16]);
        expect(readPngDimensions('../public/favicon-32x32.png')).toEqual([32, 32]);
        expect(readPngDimensions('../public/apple-touch-icon.png')).toEqual([180, 180]);
        expect(readIcoDimensions('../public/favicon.ico')).toEqual([[16, 16], [32, 32]]);
    });

    it('ships the two-path favicon mark in steel wool and paper theme colours', () => {
        const faviconSvg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');

        expect(faviconSvg.match(/<path\b/g) ?? []).toHaveLength(2);
        expect(faviconSvg).toMatch(/\.mark\s*\{\s*fill:\s*#5b6267/);
        expect(faviconSvg).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
        expect(faviconSvg).toMatch(/fill:\s*#f4f1ec/);
    });

    it('ships the square-cropped paper mark used by the dark header', () => {
        expect(readSvgCanvas('../public/assets/stagistic-brand/stagistic-mark-on-dark.svg')).toEqual({
            width: '120',
            height: '120',
            viewBox: '9.95484 8.87608 94.88736 94.88736',
        });
    });

    it('fulfils the SEO contract on all static routes', () => {
        const routes = [
            '../dist/index.html',
            '../dist/editor/playwriting.html',
            '../dist/editor/musicals.html',
            '../dist/editor/syntax.html',
            '../dist/open-source.html',
            '../dist/404.html',
        ];

        for (const route of routes) {
            const html = readFileSync(new URL(route, import.meta.url), 'utf8');

            expect(html).toMatch(/<title>[^<]+<\/title>/);
            expect(html).toMatch(/<meta name="description" content="[^"]+"/);

            if (route !== '../dist/404.html') {
                expect(html).toMatch(/<link rel="canonical" href="[^"]+"/);
            }

            const h1s = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) ?? [];

            expect(h1s).toHaveLength(1);
        }
    });

    it('publishes structured data for the site and product pages', () => {
        type GraphEntry = {
            '@type': string,
            url?: string,
            itemListElement?: Array<{name: string, position: number}>,
            applicationCategory?: string,
            operatingSystem?: string,
            offers?: {price: string, priceCurrency: string},
        };
        type StructuredData = {'@graph': GraphEntry[]};

        const readStructuredData = (route: string): StructuredData => {
            const html = readFileSync(new URL(route, import.meta.url), 'utf8');
            const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];

            expect(json).toBeDefined();

            if (!json) {
                throw new Error('Expected structured data');
            }

            return JSON.parse(json) as StructuredData;
        };
        const routes = [
            '../dist/index.html',
            '../dist/editor/playwriting.html',
            '../dist/editor/musicals.html',
            '../dist/editor/syntax.html',
            '../dist/open-source.html',
        ];

        for (const route of routes) {
            const structuredData = readStructuredData(route);
            const types = structuredData['@graph'].map(entry => entry['@type']);

            expect(types).toContain('Organization');
            expect(types).toContain('WebSite');
        }

        const home = readStructuredData('../dist/index.html')['@graph'];
        const softwareApplication = home.find(entry => entry['@type'] === 'SoftwareApplication');

        expect(softwareApplication).toMatchObject({
            applicationCategory: 'WritingApplication',
            operatingSystem: 'macOS, Web',
            downloadUrl: 'https://stagistic.com/download/mac',
            releaseNotes: 'https://stagistic.com/changelog',
            offers: {
                price: '0',
                priceCurrency: 'USD',
            },
        });

        expect(home.find(entry => entry['@type'] === 'WebSite')).toMatchObject({url: 'https://stagistic.com'});

        for (const route of [
            '../dist/editor/playwriting.html',
            '../dist/editor/musicals.html',
            '../dist/editor/syntax.html',
        ]) {
            const graph = readStructuredData(route)['@graph'];
            const breadcrumb = graph.find(entry => entry['@type'] === 'BreadcrumbList');

            expect(breadcrumb?.itemListElement).toHaveLength(2);
            expect(breadcrumb?.itemListElement?.[0]).toMatchObject({
                name: 'Stagistic',
                position: 1,
            });
        }
    });

    it('renders container-width dividers around the features section', () => {
        expect(homeHtml.match(/data-section-divider/g) ?? []).toHaveLength(2);
    });
});

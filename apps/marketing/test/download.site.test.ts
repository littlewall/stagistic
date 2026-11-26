import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {releases} from '@stagistic/release-notes/bundled';
import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

const dist = `${fileURLToPath(new URL('../', import.meta.url))}dist/`;
const read = (file: string) => readFileSync(`${dist}${file}`, 'utf8');
const normalize = (html: string) => html.replace(/\s+/g, ' ');

type GraphEntry = Record<string, unknown> & {'@type': string};

const readGraph = (file: string): GraphEntry[] => {
    const json = read(file).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '';

    return (JSON.parse(json) as {'@graph': GraphEntry[]})['@graph'];
};

describe('/download', () => {
    let html = '';

    beforeAll(() => {
        html = read('download.html');
    });

    it('is a proper page with one h1, a title and a canonical link', () => {
        expect(html).toMatch(/<title>Download Stagistic Editor[^<]*<\/title>/);
        expect(html).toContain('<link rel="canonical" href="https://stagistic.com/download">');
        expect(html.match(/<h1\b/g) ?? []).toHaveLength(1);
    });

    it('has the Mac app, Web app and Windows columns', () => {
        const columns = html.match(/<section\b[^>]*data-download-column="[^"]+"[\s\S]*?<\/section>/g) ?? [];

        expect(columns).toHaveLength(3);

        const [
            mac,
            web,
            windows,
        ] = columns.map(normalize);

        expect(mac).toContain('>Mac app</h2>');
        expect(mac).toContain('href="/download/mac"');
        expect(mac).toContain('Download for Mac');
        expect(mac).toContain('Apple silicon · macOS 15 or later');
        expect(web).toContain('>Web app</h2>');
        expect(web).toContain('href="https://editor.stagistic.app"');
        expect(web).toContain('Open in browser');
        expect(windows).toContain('>Windows</h2>');
        expect(windows).toContain('Not available yet.');
        expect(windows).toMatch(/<a href="https:\/\/feedback\.stagistic\.com"[^>]*>Tell us you need it\.<\/a>/);
    });

    it('compares the Mac app and the Web app, with the MCP connection only on the Mac app', () => {
        const table = normalize(html.match(/<table\b[\s\S]*?<\/table>/)?.[0] ?? '');

        for (const topic of [
            'Price and account',
            'Where your scripts live',
            'Backups',
            'MCP connection',
        ]) {
            expect(table).toContain(topic);
        }

        expect(table).toMatch(/MCP connection<\/th><td>[^<]*read-only[^<]*<\/td><td>Not available\.<\/td>/);
        expect(table).not.toContain('Updates');
    });

    it('explains the install steps and moving scripts from the Web app', () => {
        const text = normalize(html);

        expect(text).toContain('Drag Stagistic Editor to the Applications folder.');
        expect(text).toContain('<code>.stepkg</code>');
        expect(text).toContain('one script at a time');
    });

    it('leaves what the Mac app sends to the docs', () => {
        expect(html).not.toContain('What the Mac app sends');
    });

    it('links the changelog and the docs', () => {
        expect(html).toContain('href="/changelog"');
        expect(html).toContain('href="https://docs.stagistic.com"');
    });

    it('is the only page that mentions Windows', () => {
        for (const page of [
            'index.html',
            'open-source.html',
            'editor/playwriting.html',
            'editor/musicals.html',
            'changelog.html',
        ]) {
            expect(read(page).replace(/<script\b[\s\S]*?<\/script>/g, '')).not.toMatch(/Windows/i);
        }
    });
});

describe('system-aware call to action', () => {
    const home = () => read('index.html');

    it('renders the browser variant by default and keeps the Mac variant hidden', () => {
        const ctas = home().match(/<div\b[^>]*data-system-cta>[\s\S]*?<\/div><\/div>/g) ?? [];

        expect(ctas.length).toBeGreaterThanOrEqual(1);

        for (const cta of ctas) {
            const browser = cta.match(/<div\b[^>]*data-cta-variant="browser"[^>]*>[\s\S]*?<\/div>/)?.[0] ?? '';
            const mac = cta.match(/<div\b[^>]*data-cta-variant="mac"[^>]*>[\s\S]*?<\/div>/)?.[0] ?? '';

            expect(browser).not.toContain('hidden');
            expect(browser).toContain('href="https://editor.stagistic.app"');
            expect(normalize(browser)).toContain('Open in browser');
            expect(browser).toContain('href="/download"');
            expect(mac).toMatch(/^<div\b[^>]*\bhidden\b/);
            expect(mac).toContain('href="/download/mac"');
            expect(normalize(mac)).toContain('Download for Mac');
            expect(normalize(mac)).toContain('Apple silicon · macOS 15 or later');
        }
    });

    it('ships the detection script', () => {
        // Astro inlines small scripts into the page.
        const bundled = Array.from(home().matchAll(/<script type="module">([\s\S]*?)<\/script>/g), match => match[1]).join('\n');

        expect(bundled).toContain('data-system-cta');
        expect(bundled).toContain('macOS');
    });
});

describe('structured data', () => {
    it('describes the software for macOS and the web', () => {
        const application = readGraph('download.html').find(entry => entry['@type'] === 'SoftwareApplication');

        expect(application).toMatchObject({
            operatingSystem: 'macOS, Web',
            downloadUrl: 'https://stagistic.com/download/mac',
            releaseNotes: 'https://stagistic.com/changelog',
        });
        expect(application?.softwareVersion).toBe(releases[0]?.release);
    });
});

describe('routing', () => {
    it('lists /download in the sitemap', () => {
        expect(read('sitemap.xml')).toContain('<loc>https://stagistic.com/download</loc>');
    });

    it('redirects /download/mac to the latest stably named DMG with a 302', () => {
        const rule = read('_redirects').split('\n').find(line => line.startsWith('/download/mac '));

        expect(rule).toBe('/download/mac https://github.com/littlewall/stagistic/releases/latest/download/Stagistic-Editor-mac-arm64.dmg 302');
    });

    it('keeps the DMG name in step with the release script', () => {
        const lib = readFileSync(fileURLToPath(new URL('../../desktop/scripts/release/lib.ts', import.meta.url)), 'utf8');

        expect(lib).toContain('Stagistic-Editor-mac-arm64.dmg');
        expect(lib).toContain('littlewall/stagistic');
    });

    it('links Download from the header and the footer', () => {
        const html = read('index.html');
        const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';
        const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';

        expect(header).toMatch(/<a href="\/download"[^>]*>\s*Download\s*<\/a>/);
        expect(footer).toMatch(/<a href="\/download"[^>]*>\s*Download\s*<\/a>/);
    });
});

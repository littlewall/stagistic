import {execFileSync} from 'node:child_process';
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {serializeRelease} from '@stagistic/release-notes';
import {releases} from '@stagistic/release-notes/bundled';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {fixtureReleases} from './fixtures/releases';

const marketingRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

const read = (root: string, file: string) => readFileSync(join(root, file), 'utf8');

describe('changelog in the built site', () => {
    const dist = join(marketingRoot, 'dist');

    it('publishes the page, its feed and a sitemap entry', () => {
        const html = read(dist, 'changelog.html');
        const feed = read(dist, 'changelog.xml');

        expect(html).toMatch(/<title>Changelog - Stagistic<\/title>/);
        expect(html).toContain('<link rel="canonical" href="https://stagistic.com/changelog">');
        expect(html.match(/<h1\b/g) ?? []).toHaveLength(1);
        expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+type="application\/rss\+xml"[^>]+href="\/changelog\.xml"/);
        expect(feed).toContain('<rss version="2.0"');
        expect(feed.match(/<item>/g) ?? []).toHaveLength(releases.length);
        expect(read(dist, 'sitemap.xml')).toContain('<loc>https://stagistic.com/changelog</loc>');
    });

    it('links the changelog from the footer only when a Release exists, and shows a calm empty state otherwise', () => {
        const footer = read(dist, 'index.html').match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';
        const html = read(dist, 'changelog.html');

        expect(footer.includes('href="/changelog"')).toBe(releases.length > 0);
        expect(html.includes('The first Release is on its way.')).toBe(releases.length === 0);

        for (const release of releases) {
            expect(html).toContain(`id="release-${release.release}"`);
        }
    });

    it('keeps the changelog out of the primary navigation', () => {
        const header = read(dist, 'index.html').match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';

        expect(header).not.toContain('/changelog');
    });
});

describe('Release images', () => {
    it('exist in both the web app and the marketing site, as each serves its own public folder', () => {
        const images = releases.flatMap(release => release.notes.flatMap(note => (note.image?.startsWith('/') && !note.image.startsWith('//') ? [note.image] : [])));

        for (const image of images) {
            expect(existsSync(join(repositoryRoot, 'apps/web/public', image)), `apps/web/public${image}`).toBe(true);
            expect(existsSync(join(marketingRoot, 'public', image)), `apps/marketing/public${image}`).toBe(true);
        }
    });
});

describe('changelog built from fixture Releases', () => {
    const fixtureFiles = fixtureReleases.map(release => join(repositoryRoot, 'releases', `${release.release}.md`));
    let outDir = '';
    let html = '';
    let feed = '';
    let sitemap = '';
    let homeHtml = '';

    beforeAll(() => {
        for (const file of fixtureFiles) {
            if (existsSync(file)) {
                throw new Error(`${file} exists; refusing to overwrite a real Release`);
            }
        }

        outDir = mkdtempSync(join(tmpdir(), 'stagistic-changelog-'));

        try {
            fixtureReleases.forEach((release, index) => writeFileSync(fixtureFiles[index], serializeRelease(release)));
            execFileSync(process.execPath, [
                join(marketingRoot, 'node_modules/astro/bin/astro.mjs'),
                'build',
                '--outDir',
                outDir,
            ], {
                cwd: marketingRoot,
                env: {...process.env, NODE_ENV: 'production'},
                stdio: 'pipe',
            });
        } finally {
            for (const file of fixtureFiles) {
                rmSync(file, {force: true});
            }
        }

        html = read(outDir, 'changelog.html');
        feed = read(outDir, 'changelog.xml');
        sitemap = read(outDir, 'sitemap.xml');
        homeHtml = read(outDir, 'index.html');
    }, 240_000);

    afterAll(() => {
        for (const file of fixtureFiles) {
            rmSync(file, {force: true});
        }

        if (outDir) {
            rmSync(outDir, {recursive: true, force: true});
        }
    });

    it('lists Releases newest first with stable anchors and dates', () => {
        const newest = html.indexOf('id="release-99.0.0"');
        const older = html.indexOf('id="release-98.0.0"');

        expect(newest).toBeGreaterThan(-1);
        expect(older).toBeGreaterThan(newest);
        expect(html).toMatch(/<time[^>]+datetime="2026-12-02"[^>]*>December 2, 2026<\/time>/);
        expect(html).toContain('href="#release-99.0.0"');
        expect(html).not.toContain('The first Release is on its way.');
    });

    it('lists notes flat, breaking first, each with its type label and no group headings', () => {
        const section = html.slice(html.indexOf('id="release-99.0.0"'), html.indexOf('id="release-98.0.0"'));
        const titles = Array.from(section.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g), match => match[1].replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').trim());
        const labels = Array.from(section.matchAll(/data-note-type="[^"]+"[^>]*>([^<]+)</g), match => match[1]);

        expect(Array.from(section.matchAll(/data-note-weight="([^"]+)"/g), match => match[1])).toEqual([
            'highlight',
            'highlight',
            'fix',
        ]);
        expect(labels).toEqual([
            'Improved',
            'New',
            'Fixed',
        ]);
        expect(titles).toHaveLength(3);
        expect(titles[0]).toContain('Breaking change');
        expect(titles[0]).toContain('Safer exports');
        expect(section).not.toMatch(/>Breaking changes</);
        expect(section).toMatch(/<li[^>]+data-breaking[^>]*>\s*<h3\b[^>]*>\s*<span[^>]*>Breaking change<\/span>/);
    });

    it('shows a same-origin image and links to the guide and the article, and nothing unsafe', () => {
        // Only the fixture Releases: the real Releases built beside them have their own covers.
        const start = html.indexOf('id="release-99.0.0"');
        const afterFixtures = html.indexOf('id="release-', html.indexOf('id="release-98.0.0"') + 1);
        const fixtures = html.slice(start, afterFixtures === -1 ? html.indexOf('</main>') : afterFixtures);

        expect(fixtures.match(/<img\b/g) ?? []).toHaveLength(1);
        expect(fixtures).toMatch(/<img[^>]+src="\/images\/templates\.png"/);
        expect(html).not.toContain('evil.example');
        expect(html).toContain('href="https://docs.stagistic.com/guide/templates"');
        expect(html).toContain('href="https://stagistic.com/articles/templates"');
        expect(html).not.toContain('<script>alert');
        expect(html).not.toContain('javascript:');
    });

    it('links the footer and feeds readers an absolute entry per Release', () => {
        const footer = homeHtml.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';

        expect(footer).toContain('href="/changelog"');
        expect(feed.indexOf('<title>Release 99.0.0</title>')).toBeGreaterThan(-1);
        expect(feed.indexOf('<title>Release 98.0.0</title>')).toBeGreaterThan(feed.indexOf('<title>Release 99.0.0</title>'));
        expect(feed).toContain('<guid isPermaLink="true">https://stagistic.com/changelog#release-99.0.0</guid>');
        expect(feed).not.toMatch(/(?:href|src)=&quot;\//);
        expect(sitemap).toContain('<loc>https://stagistic.com/changelog</loc>');
    });
});

import {BREAKING_NOTE_LABEL, RELEASE_NOTE_TYPE_LABELS} from '@stagistic/release-notes';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    buildChangelogFeed,
    markdownToHtml,
    releaseAnchor,
    toChangelog,
} from '../src/data/changelog';
import {fixtureReleases} from './fixtures/releases';

const site = 'https://stagistic.com';

describe('markdownToHtml', () => {
    it('renders paragraphs, lists and inline marks', () => {
        expect(markdownToHtml('A **b** *i* `c`\n\n- x\n- y')).toBe(
            '<p>A <strong>b</strong> <em>i</em> <code>c</code></p><ul><li>x</li><li>y</li></ul>',
        );
    });

    it('escapes raw HTML and attribute values, and keeps only http(s) links', () => {
        const html = markdownToHtml('<script>x</script> [a](https://e.com/?q="1"&r=2) [b](javascript:alert(1))');

        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
        expect(html).toContain('<a href="https://e.com/?q=&quot;1&quot;&amp;r=2" rel="noopener noreferrer">a</a>');
        expect(html).not.toContain('javascript:');
    });
});

describe('toChangelog', () => {
    const changelog = toChangelog(fixtureReleases, {site});

    it('keeps the given order and gives each Release a stable anchor and URL', () => {
        expect(changelog.map(release => release.release)).toEqual(['99.0.0', '98.0.0']);
        expect(releaseAnchor('99.0.0')).toBe('release-99.0.0');
        expect(changelog[0]).toMatchObject({
            anchor: 'release-99.0.0',
            url: 'https://stagistic.com/changelog#release-99.0.0',
            dateLabel: 'December 2, 2026',
        });
    });

    it('lists notes flat as the app does: breaking first, then New, Improved, Fixed, each with its label', () => {
        expect(changelog[0].notes.map(note => [
            note.title,
            note.label,
            note.breaking,
        ])).toEqual([
            [
                'Safer exports',
                'Improved',
                true,
            ],
            [
                'Start from a template',
                'New',
                false,
            ],
            [
                'Cue numbers & ids',
                'Fixed',
                false,
            ],
        ]);
        expect(changelog[0]).not.toHaveProperty('groups');
    });

    it('gives each note a weight: Highlights, fixes and the rest', () => {
        expect(changelog[0].notes.map(note => [note.title, note.weight])).toEqual([
            ['Safer exports', 'highlight'],
            ['Start from a template', 'highlight'],
            ['Cue numbers & ids', 'fix'],
        ]);
    });

    it('uses the labels of @stagistic/release-notes', () => {
        expect(RELEASE_NOTE_TYPE_LABELS).toEqual({
            feature: 'New',
            improvement: 'Improved',
            fix: 'Fixed',
        });
        expect(BREAKING_NOTE_LABEL).toBe('Breaking change');
        expect(changelog[0].notes.map(note => note.label)).toEqual([
            RELEASE_NOTE_TYPE_LABELS.improvement,
            RELEASE_NOTE_TYPE_LABELS.feature,
            RELEASE_NOTE_TYPE_LABELS.fix,
        ]);
    });

    it('resolves links like the app and keeps only images served by the site itself', () => {
        const [
            ,
            template,
            fix,
        ] = changelog[0].notes;

        expect(template).toMatchObject({
            image: '/images/templates.png',
            docsUrl: 'https://docs.stagistic.com/guide/templates',
            articleUrl: 'https://stagistic.com/articles/templates',
        });
        expect(fix.image).toBeUndefined();
    });
});

describe('patch Releases', () => {
    it('are included in the page model and the feed', () => {
        const [first] = fixtureReleases;
        const withPatch = [{...first, release: '99.0.1'}, ...fixtureReleases];
        const changelog = toChangelog(withPatch, {site});

        expect(changelog.map(release => release.release)).toEqual([
            '99.0.1',
            '99.0.0',
            '98.0.0',
        ]);
        expect(buildChangelogFeed(changelog, {site})).toContain('99.0.1');
    });
});

describe('buildChangelogFeed', () => {
    const feed = buildChangelogFeed(toChangelog(fixtureReleases, {site}), {site});

    it('is a well-formed RSS 2.0 feed with absolute URLs and an entry per Release', () => {
        expect(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"')).toBe(true);
        expect(feed).toContain('<link>https://stagistic.com/changelog</link>');
        expect(feed).toContain('<atom:link href="https://stagistic.com/changelog.xml" rel="self" type="application/rss+xml"/>');
        expect(feed.match(/<item>/g)).toHaveLength(2);
        expect(feed).toContain('<title>Release 99.0.0</title>');
        expect(feed).toContain('<guid isPermaLink="true">https://stagistic.com/changelog#release-99.0.0</guid>');
        expect(feed).toContain('<pubDate>Wed, 02 Dec 2026 00:00:00 GMT</pubDate>');
        expect(feed.indexOf('Release 99.0.0')).toBeLessThan(feed.indexOf('Release 98.0.0'));
    });

    it('escapes entry HTML inside the description and makes image and links absolute', () => {
        const description = feed.match(/<item>[\s\S]*?<description>([\s\S]*?)<\/description>/)?.[1] ?? '';

        expect(description).not.toContain('<');
        expect(description).toContain('&lt;img src=&quot;https://stagistic.com/images/templates.png&quot;');
        expect(description).toContain('https://docs.stagistic.com/guide/templates');
        expect(description).not.toContain('&lt;h3&gt;');
        expect(description).toContain('&lt;h4&gt;Breaking change: Safer exports&lt;/h4&gt;');
        // The image is a cover right under the note heading.
        expect(description).toContain('&lt;h4&gt;New: Start from a template&lt;/h4&gt;&lt;p&gt;&lt;img src=&quot;https://stagistic.com/images/templates.png&quot;');
        expect(description).toContain('&lt;h4&gt;Fixed: Cue numbers &amp;amp; ids&lt;/h4&gt;');
        expect(description.indexOf('Breaking change: Safer exports')).toBeLessThan(description.indexOf('New: Start from a template'));
        expect(description.indexOf('New: Start from a template')).toBeLessThan(description.indexOf('Fixed: Cue numbers'));
        expect(description).not.toContain('&lt;script&gt;alert');
    });

    it('is valid with no Releases', () => {
        const empty = buildChangelogFeed([], {site});

        expect(empty).not.toContain('<item>');
        expect(empty).not.toContain('<lastBuildDate>');
        expect(empty).toContain('<channel>');
    });
});

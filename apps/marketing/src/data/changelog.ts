import {
    BREAKING_NOTE_LABEL,
    getReleaseNoteWeight,
    type Release,
    RELEASE_NOTE_TYPE_LABELS,
    RELEASE_NOTE_TYPES,
    type ReleaseNoteType,
    type ReleaseNoteWeight,
    resolveNoteImage,
    resolveNoteLink,
} from '@stagistic/release-notes';
import {type MarkdownInline, parseMarkdown} from '@stagistic/shared';

/*
 * The changelog page and its RSS feed read Releases through one view model, so both show the same
 * order, labels, links and images. Pure: no Astro, no file access.
 */

const DOCS_SITE = 'https://docs.stagistic.com';

export {BREAKING_NOTE_LABEL};

export interface ChangelogNote {
    type: ReleaseNoteType,
    /** The type's label, e.g. `New`. */
    label: string,
    title: string,
    /** A change to how existing data behaves; listed first and labelled `BREAKING_NOTE_LABEL`. */
    breaking: boolean,
    /** `highlight` for a main feature, `fix` for a fix, else `plain`; drives the pill colour. */
    weight: ReleaseNoteWeight,
    /** Safe HTML made from the note's Markdown. */
    descriptionHtml: string,
    /** Path of a file in this site's `public/` folder. */
    image?: string,
    docsUrl?: string,
    articleUrl?: string,
}

export interface ChangelogRelease {
    release: string,
    /** `YYYY-MM-DD`. */
    date: string,
    dateLabel: string,
    anchor: string,
    /** Absolute URL of this Release on the changelog page. */
    url: string,
    /** Breaking notes first, then New, Improved, Fixed; the order the app shows. */
    notes: ChangelogNote[],
}

const dateFormat = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
});

const atMidnightUtc = (date: string) => new Date(`${date}T00:00:00Z`);

const escapeXml = (value: string) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;');

const withoutTrailingSlash = (site: string | URL) => new URL(site).href.replace(/\/$/, '');

const renderInline = (inline: MarkdownInline): string => {
    const text = escapeXml(inline.text);

    switch (inline.kind) {
        case 'strong':
            return `<strong>${text}</strong>`;
        case 'emphasis':
            return `<em>${text}</em>`;
        case 'code':
            return `<code>${text}</code>`;
        case 'link':
            return `<a href="${escapeXml(inline.href)}" rel="noopener noreferrer">${text}</a>`;
        default:
            return text;
    }
};

/** Release Note Markdown as HTML. Every piece of text is escaped, so raw HTML stays literal. */
export const markdownToHtml = (source: string): string => parseMarkdown(source).map(block => (block.kind === 'list'
    ? `<ul>${block.items.map(item => `<li>${item.map(renderInline).join('')}</li>`).join('')}</ul>`
    : `<p>${block.inlines.map(renderInline).join('')}</p>`)).join('');

export const releaseAnchor = (release: string) => `release-${release}`;

export const toChangelog = (releases: readonly Release[], options: {site: string | URL}): ChangelogRelease[] => {
    const site = withoutTrailingSlash(options.site);

    return releases
        .map(release => {
            const notes = release.notes.map(note => ({
                type: note.type,
                label: RELEASE_NOTE_TYPE_LABELS[note.type],
                title: note.title,
                breaking: note.breaking,
                weight: getReleaseNoteWeight(note),
                descriptionHtml: markdownToHtml(note.description),
                image: resolveNoteImage(note.image),
                docsUrl: resolveNoteLink(note.docs, DOCS_SITE),
                articleUrl: resolveNoteLink(note.article, site),
            } satisfies ChangelogNote));
            const ordered = [
                ...notes.filter(note => note.breaking),
                ...RELEASE_NOTE_TYPES.flatMap(type => notes.filter(note => !note.breaking && note.type === type)),
            ];

            return {
                release: release.release,
                date: release.date,
                dateLabel: dateFormat.format(atMidnightUtc(release.date)),
                anchor: releaseAnchor(release.release),
                url: `${site}/changelog#${releaseAnchor(release.release)}`,
                notes: ordered,
            };
        });
};

const noteHtml = (note: ChangelogNote, site: string) => {
    const links = [
        note.docsUrl ? `<a href="${escapeXml(note.docsUrl)}">Read the guide</a>` : '',
        note.articleUrl ? `<a href="${escapeXml(note.articleUrl)}">Read the article</a>` : '',
    ].filter(Boolean);

    return [
        `<h4>${escapeXml(`${note.breaking ? BREAKING_NOTE_LABEL : note.label}: ${note.title}`)}</h4>`,
        note.image ? `<p><img src="${escapeXml(new URL(note.image, site).href)}" alt=""></p>` : '',
        note.descriptionHtml,
        links.length > 0 ? `<p>${links.join(' ')}</p>` : '',
    ].join('');
};

const releaseHtml = (release: ChangelogRelease, site: string) => release.notes.map(note => noteHtml(note, site)).join('');

/** RSS 2.0 with an entry per Release (given order, newest first). Every URL is absolute. */
export const buildChangelogFeed = (changelog: readonly ChangelogRelease[], options: {site: string | URL}): string => {
    const site = withoutTrailingSlash(options.site);
    const items = changelog.map(release => `        <item>
            <title>${escapeXml(`Release ${release.release}`)}</title>
            <link>${escapeXml(release.url)}</link>
            <guid isPermaLink="true">${escapeXml(release.url)}</guid>
            <pubDate>${atMidnightUtc(release.date).toUTCString()}</pubDate>
            <description>${escapeXml(releaseHtml(release, site))}</description>
        </item>`).join('\n');
    const lastBuildDate = changelog.length > 0 ? `\n        <lastBuildDate>${atMidnightUtc(changelog[0].date).toUTCString()}</lastBuildDate>` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Stagistic Editor changelog</title>
        <link>${site}/changelog</link>
        <description>What is new, improved and fixed in each Release of Stagistic Editor.</description>
        <language>en</language>${lastBuildDate}
        <atom:link href="${site}/changelog.xml" rel="self" type="application/rss+xml"/>${items ? `\n${items}` : ''}
    </channel>
</rss>
`;
};

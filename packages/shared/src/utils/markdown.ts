/*
 * The smallest Markdown subset a Release Note description needs (shared by the app dialog and the
 * marketing changelog). It is parsed into plain data, so a renderer escapes all text: raw HTML
 * stays literal text, images are not read and a link is kept only when it points to http(s).
 */

export type MarkdownInline =
    | {kind: 'text', text: string}
    | {kind: 'strong', text: string}
    | {kind: 'emphasis', text: string}
    | {kind: 'code', text: string}
    | {
        kind: 'link',
        text: string,
        href: string,
    };

export type MarkdownBlock =
    | {kind: 'paragraph', inlines: MarkdownInline[]}
    | {kind: 'list', items: MarkdownInline[][]};

const INLINE_PATTERN = /(?<!!)\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\s][^*]*)\*/g;
const BULLET_PATTERN = /^[-*]\s+(.*)$/;
const SAFE_LINK_PATTERN = /^https?:\/\/\S+$/i;

const parseInlines = (text: string): MarkdownInline[] => {
    const inlines: MarkdownInline[] = [];
    let cursor = 0;

    const pushText = (value: string) => {
        if (value) {
            inlines.push({kind: 'text', text: value});
        }
    };

    for (const match of text.matchAll(INLINE_PATTERN)) {
        const [
            whole,
            linkText,
            href,
            strong,
            code,
            emphasis,
        ] = match;

        pushText(text.slice(cursor, match.index));
        cursor = match.index + whole.length;

        if (linkText !== undefined) {
            inlines.push(SAFE_LINK_PATTERN.test(href) ? {
                kind: 'link',
                text: linkText,
                href,
            } : {kind: 'text', text: linkText});
        } else if (strong !== undefined) {
            inlines.push({kind: 'strong', text: strong});
        } else if (code !== undefined) {
            inlines.push({kind: 'code', text: code});
        } else {
            inlines.push({kind: 'emphasis', text: emphasis});
        }
    }

    pushText(text.slice(cursor));

    return mergeTextRuns(inlines);
};

const mergeTextRuns = (inlines: MarkdownInline[]): MarkdownInline[] => {
    const merged: MarkdownInline[] = [];

    for (const inline of inlines) {
        const previous = merged.at(-1);

        if (inline.kind === 'text' && previous?.kind === 'text') {
            previous.text += inline.text;
        } else {
            merged.push({...inline});
        }
    }

    return merged;
};

const parseChunk = (lines: string[]): MarkdownBlock => {
    const bullets = lines.map(line => BULLET_PATTERN.exec(line.trim()));

    if (bullets.every(bullet => bullet !== null)) {
        return {kind: 'list', items: bullets.map(bullet => parseInlines(bullet[1]))};
    }

    return {kind: 'paragraph', inlines: parseInlines(lines.map(line => line.trim()).join(' '))};
};

export const parseMarkdown = (source: string): MarkdownBlock[] => {
    const blocks: MarkdownBlock[] = [];
    let chunk: string[] = [];

    const flush = () => {
        if (chunk.length > 0) {
            blocks.push(parseChunk(chunk));
            chunk = [];
        }
    };

    for (const line of source.split(/\r?\n/)) {
        if (line.trim() === '') {
            flush();
        } else {
            chunk.push(line);
        }
    }

    flush();

    return blocks;
};

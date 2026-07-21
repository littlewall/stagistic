import {createNodeId} from '@stagistic/shared';

import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from '../characters';
import type {ScriptNode} from '../document';
import {
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
} from '../music';
import {normalizeCharacterKey} from '../syntax';
import {readQuotedLiteral} from './literals';
import {StagisticParseError} from './types';

type InlineMark = NonNullable<ScriptNode['marks']>[number];

export interface ParsedStageBlock {
    node: ScriptNode,
    music?: {
        role: 'start' | 'out',
        number: number,
        line: number,
    },
}

const sameMarks = (left: InlineMark[] | undefined, right: InlineMark[] | undefined) => {
    return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
};

const appendText = (nodes: ScriptNode[], text: string, marks?: InlineMark[]) => {
    if (!text) {
        return;
    }

    const previous = nodes[nodes.length - 1];

    if (previous?.type === 'text' && sameMarks(previous.marks, marks)) {
        previous.text = `${previous.text ?? ''}${text}`;

        return;
    }

    nodes.push({
        type: 'text',
        text,
        marks: marks && marks.length > 0 ? marks : undefined,
    });
};

const getEmphasisMarks = (activeMarks: Set<string>): InlineMark[] => {
    return [
        'bold',
        'italic',
        'underline',
    ]
        .filter(mark => activeMarks.has(mark))
        .map(type => ({type}));
};

const hasClosingMarker = (source: string, marker: string, start: number) => {
    return source.indexOf(marker, start + marker.length) >= 0;
};

export const parseInlineText = (source: string, line: number): ScriptNode[] => {
    const nodes: ScriptNode[] = [];
    const activeMarks = new Set<string>();

    for (let index = 0; index < source.length;) {
        const remaining = source.slice(index);
        const emphasis = remaining.startsWith('**')
            ? {marker: '**', mark: 'bold'}
            : remaining.startsWith('*')
                ? {marker: '*', mark: 'italic'}
                : remaining.startsWith('_')
                    ? {marker: '_', mark: 'underline'}
                    : null;

        if (emphasis && (activeMarks.has(emphasis.mark) || hasClosingMarker(source, emphasis.marker, index))) {
            if (activeMarks.has(emphasis.mark)) {
                activeMarks.delete(emphasis.mark);
            } else {
                activeMarks.add(emphasis.mark);
            }

            index += emphasis.marker.length;
            continue;
        }

        if (source[index] === '\\' && [
            '*',
            '_',
            '\\',
        ].includes(source[index + 1] ?? '')) {
            appendText(nodes, source[index + 1], getEmphasisMarks(activeMarks));
            index += 2;
            continue;
        }

        if (source[index] === '@' && source[index + 1] !== '@') {
            const tagStart = index + 1;
            let tagText = '';
            let tagEnd = tagStart;

            if (source[tagStart] === '"') {
                const literal = readQuotedLiteral(source, tagStart, line);

                tagText = literal.value;
                tagEnd = literal.end;
            } else {
                while (tagEnd < source.length && !(/\s/u).test(source[tagEnd])) {
                    tagEnd += 1;
                }

                tagText = source.slice(tagStart, tagEnd);
            }

            if (tagText) {
                const marks = [
                    ...getEmphasisMarks(activeMarks), {
                        type: CHARACTER_TAG_MARK_NAME,
                        attrs: {
                            [CHARACTER_TAG_KEY_ATTR]: normalizeCharacterKey(tagText),
                            [CHARACTER_TAG_ID_ATTR]: null,
                        },
                    },
                ];

                appendText(nodes, tagText, marks);
                index = tagEnd;
                continue;
            }
        }

        appendText(nodes, source[index], getEmphasisMarks(activeMarks));
        index += 1;
    }

    return nodes;
};

const readMusicMarker = (source: string, start: number, line: number) => {
    if ((/^@@cue\b/u).test(source.slice(start))) {
        throw new StagisticParseError('@@cue is no longer supported; use @@music.', line);
    }

    const musicMatch = (/^@@music\s+(\d+)\s+/u).exec(source.slice(start));

    if (musicMatch) {
        const titleStart = start + musicMatch[0].length;
        const title = readQuotedLiteral(source, titleStart, line);

        return {
            end: title.end,
            number: Number(musicMatch[1]),
            role: 'start' as const,
            node: {
                type: MUSIC_START_NODE_NAME,
                attrs: {
                    [MUSIC_ID_ATTR]: createNodeId(),
                    [MUSIC_MODE_ATTR]: 'open',
                    [MUSIC_TITLE_ATTR]: title.value,
                    [MUSIC_KIND_ATTR]: null,
                },
            } satisfies ScriptNode,
        };
    }

    const outMatch = (/^@@out\s+(\d+)/u).exec(source.slice(start));

    if (outMatch) {
        return {
            end: start + outMatch[0].length,
            number: Number(outMatch[1]),
            role: 'out' as const,
            node: {type: MUSIC_OUT_NODE_NAME} satisfies ScriptNode,
        };
    }

    return null;
};

export const parseStageDirectionLine = (source: string, line: number): ParsedStageBlock[] => {
    const blocks: ParsedStageBlock[] = [];
    let plainText = '';
    let cursor = 0;

    const pushPlainBlock = () => {
        if (!plainText) {
            return;
        }

        blocks.push({node: {type: 'stageDirection', content: parseInlineText(plainText, line)}});
        plainText = '';
    };

    while (cursor < source.length) {
        const markerStart = source.indexOf('@@', cursor);

        if (markerStart < 0) {
            plainText += source.slice(cursor);
            break;
        }

        plainText += source.slice(cursor, markerStart);

        const marker = readMusicMarker(source, markerStart, line);

        if (!marker) {
            plainText += '@@';
            cursor = markerStart + 2;
            continue;
        }

        const content = parseInlineText(plainText.trimEnd(), line);

        content.push(marker.node);
        blocks.push({
            node: {type: 'stageDirection', content},
            music: {
                role: marker.role, number: marker.number, line,
            },
        });
        plainText = '';
        cursor = marker.end;
    }

    pushPlainBlock();

    return blocks.length > 0
        ? blocks
        : [{node: {type: 'stageDirection', content: []}}];
};

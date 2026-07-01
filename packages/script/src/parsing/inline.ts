import {createNodeId} from '@stagistic/shared';

import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from '../characters';
import {
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_MODE_ATTR,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
} from '../cues';
import type {ScriptNode} from '../document';
import {normalizeCharacterKey} from '../syntax';
import {readQuotedLiteral} from './literals';

type InlineMark = NonNullable<ScriptNode['marks']>[number];

export interface ParsedStageBlock {
    node: ScriptNode,
    cue?: {
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
    return ['bold', 'italic', 'underline']
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

        if (source[index] === '\\' && ['*', '_', '\\'].includes(source[index + 1] ?? '')) {
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
                    ...getEmphasisMarks(activeMarks),
                    {
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

const readCueMarker = (source: string, start: number, line: number) => {
    const cueMatch = /^@@cue\s+(\d+)\s+/u.exec(source.slice(start));

    if (cueMatch) {
        const titleStart = start + cueMatch[0].length;
        const title = readQuotedLiteral(source, titleStart, line);

        return {
            end: title.end,
            number: Number(cueMatch[1]),
            role: 'start' as const,
            node: {
                type: CUE_START_NODE_NAME,
                attrs: {
                    [CUE_ID_ATTR]: createNodeId(),
                    [CUE_MODE_ATTR]: 'open',
                    [CUE_TITLE_ATTR]: title.value,
                    [CUE_KIND_ATTR]: null,
                },
            } satisfies ScriptNode,
        };
    }

    const outMatch = /^@@out\s+(\d+)/u.exec(source.slice(start));

    if (outMatch) {
        return {
            end: start + outMatch[0].length,
            number: Number(outMatch[1]),
            role: 'out' as const,
            node: {type: CUE_OUT_NODE_NAME} satisfies ScriptNode,
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
        const marker = readCueMarker(source, markerStart, line);

        if (!marker) {
            plainText += '@@';
            cursor = markerStart + 2;
            continue;
        }

        const content = parseInlineText(plainText.trimEnd(), line);

        content.push(marker.node);
        blocks.push({
            node: {type: 'stageDirection', content},
            cue: {role: marker.role, number: marker.number, line},
        });
        plainText = '';
        cursor = marker.end;
    }

    pushPlainBlock();

    return blocks.length > 0
        ? blocks
        : [{node: {type: 'stageDirection', content: []}}];
};

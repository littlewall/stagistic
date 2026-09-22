import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import {isScriptBlockNodeName, normalizeBlockNodeType} from '../../scriptCore';
import type {SearchCriteria, SearchResult} from './types';

interface TextSegment {
    textFrom: number;
    textTo: number;
    docFrom: number;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const collectText = (block: ProseMirrorNode, blockFrom: number) => {
    const segments: TextSegment[] = [];
    let text = '';

    block.descendants((node, relativeFrom) => {
        if (!node.isText || !node.text) {
            return true;
        }

        segments.push({
            textFrom: text.length,
            textTo: text.length + node.text.length,
            docFrom: blockFrom + 1 + relativeFrom,
        });
        text += node.text;

        return false;
    });

    return {segments, text};
};

const mapRange = (segments: readonly TextSegment[], from: number, to: number) => {
    const start = segments.find(segment => from >= segment.textFrom && from < segment.textTo);
    const end = segments.find(segment => to > segment.textFrom && to <= segment.textTo);

    if (!start || !end) {
        return null;
    }

    return {
        from: start.docFrom + from - start.textFrom,
        to: end.docFrom + to - end.textFrom,
    };
};

export const findSearchResults = (document: ProseMirrorNode, criteria: SearchCriteria): readonly SearchResult[] => {
    if (!criteria.query) {
        return [];
    }

    const expression = new RegExp(escapeRegExp(criteria.query), criteria.caseSensitive ? 'gu' : 'giu');
    const results: SearchResult[] = [];

    document.descendants((node, from) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        const blockType = normalizeBlockNodeType(node.type.name);

        if (criteria.blockTypes && !criteria.blockTypes.includes(blockType)) {
            return false;
        }

        const {segments, text} = collectText(node, from);
        let match = expression.exec(text);

        while (match) {
            const range = mapRange(segments, match.index, match.index + match[0].length);

            if (range) {
                results.push({
                    ...range,
                    blockId: typeof node.attrs.id === 'string' ? node.attrs.id : null,
                    blockType,
                });
            }

            match = expression.exec(text);
        }

        expression.lastIndex = 0;

        return false;
    });

    return results;
};

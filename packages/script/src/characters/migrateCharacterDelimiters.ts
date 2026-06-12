import type {
    FountainJSONContent,
    ScriptDocument,
} from '../document';
import {
    mapCharacterBlockNodes,
    type ScriptDocumentChangeResult,
    unchangedScriptDocument,
} from './documentHelpers';

/*
 * TEMPORARY — one-shot migration of the multi-character delimiter from the
 * legacy '+' to the canonical '/'. It runs on editor load (see
 * useScriptLoader) and persists immediately, so each script is rewritten
 * the first time it is opened. Delete this module and its call site once
 * all local scripts have been migrated.
 */

const findDepthZeroPlusOffsets = (text: string): number[] => {
    const offsets: number[] = [];
    let depth = 0;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];

        if (char === '(') {
            depth += 1;
        } else if (char === ')') {
            depth = Math.max(0, depth - 1);
        } else if (char === '+' && depth === 0) {
            offsets.push(index);
        }
    }

    return offsets;
};

const getInlineTextLength = (node: FountainJSONContent): number => {
    if (typeof node.text === 'string') {
        return node.text.length;
    }

    if (!Array.isArray(node.content)) {
        return 0;
    }

    return node.content.reduce((total, child) => total + getInlineTextLength(child), 0);
};

const replacePlusDelimiters = (node: FountainJSONContent): FountainJSONContent => {
    if (!Array.isArray(node.content)) {
        return node;
    }

    const fullText = node.content.map(child => {
        return typeof child.text === 'string' ? child.text : '';
    }).join('');
    const offsets = findDepthZeroPlusOffsets(fullText);

    if (offsets.length === 0) {
        return node;
    }

    let cursor = 0;
    const nextContent = node.content.map(child => {
        const start = cursor;
        const length = getInlineTextLength(child);

        cursor += length;

        if (typeof child.text !== 'string') {
            return child;
        }

        const localOffsets = offsets.filter(offset => offset >= start && offset < start + length);

        if (localOffsets.length === 0) {
            return child;
        }

        const chars = child.text.split('');

        localOffsets.forEach(offset => {
            chars[offset - start] = '/';
        });

        return {
            ...child,
            text: chars.join(''),
        };
    });

    return {
        ...node,
        content: nextContent,
    };
};

export const migrateCharacterDelimitersInScriptDocument = (
    value: ScriptDocument,
): ScriptDocumentChangeResult => {
    if (!value || value.type !== 'doc' || !Array.isArray(value.content)) {
        return unchangedScriptDocument(value);
    }

    const result = mapCharacterBlockNodes(value.content, replacePlusDelimiters);

    if (!result.changed || !result.nodes) {
        return unchangedScriptDocument(value);
    }

    return {
        value: {
            ...value,
            content: result.nodes,
        },
        changed: true,
    };
};

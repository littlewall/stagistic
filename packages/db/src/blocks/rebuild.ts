import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {getScriptBlockNodeTypeFromBlockType, isScriptBlockType} from '@stagistic/script';

import {sanitizeInlineContentNode} from './extract';
import type {RewriteStoredBlockCharacterRefRow, RewriteStoredBlockRow} from './types';

const toFallbackTextInlineContent = (textContent: string): ScriptNode[] => {
    if (textContent.length === 0) {
        return [];
    }

    return [
        {
            type: 'text',
            text: textContent,
        },
    ];
};

const parseStoredContentJson = (
    scriptId: string,
    blockId: string,
    contentJson: string | null,
    textContent: string,
    warnings: string[],
): ScriptNode[] => {
    if (!contentJson || contentJson.trim().length === 0) {
        return toFallbackTextInlineContent(textContent);
    }

    try {
        const parsed = JSON.parse(contentJson) as unknown;

        if (!Array.isArray(parsed)) {
            warnings.push(`Script ${scriptId}: block ${blockId} has invalid content_json shape.`);

            return toFallbackTextInlineContent(textContent);
        }

        return parsed
            .map(sanitizeInlineContentNode)
            .filter((item): item is ScriptNode => Boolean(item));
    } catch (error) {
        warnings.push(
            `Script ${scriptId}: block ${blockId} has unparsable content_json (${error instanceof Error ? error.message : String(error)}).`,
        );

        return toFallbackTextInlineContent(textContent);
    }
};

const toScriptDocumentFromStoredRows = (
    scriptId: string,
    blockRows: RewriteStoredBlockRow[],
    characterRefRows: RewriteStoredBlockCharacterRefRow[],
): {document: ScriptDocument, warnings: string[]} => {
    const warnings: string[] = [];

    const characterRefsByBlockId = new Map<string, Record<string, string>>();

    characterRefRows.forEach(row => {
        const current = characterRefsByBlockId.get(row.blockId) ?? {};

        current[row.characterKey] = row.characterId;
        characterRefsByBlockId.set(row.blockId, current);
    });

    const blockRowsSorted = [...blockRows]
        .sort((a, b) => a.blockOrder < b.blockOrder ? -1 : a.blockOrder > b.blockOrder ? 1 : 0);

    const createBlockNode = (row: RewriteStoredBlockRow): ScriptNode => {
        const nodeType = isScriptBlockType(row.blockType)
            ? getScriptBlockNodeTypeFromBlockType(row.blockType)
            : 'stageDirection';
        const attrs: Record<string, unknown> = {
            id: row.id,
        };
        const characterRefByKey = characterRefsByBlockId.get(row.id);

        if (characterRefByKey && Object.keys(characterRefByKey).length > 0) {
            attrs.characterRefs = characterRefByKey;
        }

        return {
            type: nodeType,
            attrs,
            content: parseStoredContentJson(
                scriptId,
                row.id,
                row.contentJson,
                row.textContent,
                warnings,
            ),
        };
    };

    const content: ScriptNode[] = [];

    let cursor = 0;

    while (cursor < blockRowsSorted.length) {
        content.push(createBlockNode(blockRowsSorted[cursor]));
        cursor += 1;
    }

    return {
        document: {
            type: 'doc',
            content,
        },
        warnings,
    };
};

export const rebuildScriptDocumentFromBlocks = (
    scriptId: string,
    blockRows: RewriteStoredBlockRow[],
    characterRefRows: RewriteStoredBlockCharacterRefRow[],
): {document: ScriptDocument, warnings: string[]} => {
    return toScriptDocumentFromStoredRows(scriptId, blockRows, characterRefRows);
};

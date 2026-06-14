import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {getScriptBlockNodeTypeFromBlockType, isScriptBlockType} from '@stagistic/script';

import {sanitizeInlineContentNode} from './extract';
import type {RewriteStoredBlockCharacterRefRow, RewriteStoredBlockRow} from './types';
import {
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
} from './types';

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
        const row = blockRowsSorted[cursor];

        if (!row.columnGroupId) {
            content.push(createBlockNode(row));
            cursor += 1;
            continue;
        }

        const groupId = row.columnGroupId;
        const groupedRows: RewriteStoredBlockRow[] = [];

        while (cursor < blockRowsSorted.length && blockRowsSorted[cursor].columnGroupId === groupId) {
            groupedRows.push(blockRowsSorted[cursor]);
            cursor += 1;
        }

        if (groupedRows.length === 0) {
            continue;
        }

        const blocksByColumn = new Map<number, ScriptNode[]>();

        groupedRows.forEach(groupRow => {
            const columnIndex = typeof groupRow.columnIndex === 'number'
                ? groupRow.columnIndex
                : 0;

            if (groupRow.columnIndex === null) {
                warnings.push(
                    `Script ${scriptId}: block ${groupRow.id} had null column_index in group ${groupId}; treated as column 0.`,
                );
            }

            const currentColumn = blocksByColumn.get(columnIndex) ?? [];

            currentColumn.push(createBlockNode(groupRow));
            blocksByColumn.set(columnIndex, currentColumn);
        });

        const columnIndexes = Array.from(blocksByColumn.keys())
            .sort((a, b) => a - b);

        const columns: ScriptNode[] = columnIndexes.map(columnIndex => {
            return {
                type: FOUNTAIN_COLUMN_NODE_NAME,
                content: blocksByColumn.get(columnIndex) ?? [],
            };
        });

        content.push({
            type: FOUNTAIN_COLUMN_GROUP_NODE_NAME,
            content: columns,
        });
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

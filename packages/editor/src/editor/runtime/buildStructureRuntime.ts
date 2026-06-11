import {
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import type {
    EditorLiveStructureRow,
    EditorLiveStructureSnapshot,
} from '../contracts';
import {
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../tiptap/fountainCore';

const EMPTY_STRUCTURE: EditorLiveStructureSnapshot = {
    rows: [],
    rowIndexByBlockId: new Map<string, number>(),
    sceneByBlockId: new Map<string, string>(),
};

const normalizeText = (value: string) => value.trim();

export const buildStructureRuntime = (doc: ProseMirrorNode): EditorLiveStructureSnapshot => {
    const rows: EditorLiveStructureRow[] = [];
    const rowIndexByBlockId = new Map<string, number>();
    const sceneByBlockId = new Map<string, string>();
    let currentSceneBlockId: string | null = null;

    try {
        doc.descendants(node => {
            if (!isFountainBlockNodeName(node.type.name)) {
                return true;
            }

            const blockType = normalizeFountainBlockType(node.attrs.blockType);
            const blockId = typeof node.attrs.id === 'string'
                ? node.attrs.id.trim()
                : '';

            if (!blockId) {
                return false;
            }

            if (blockType === ELEMENT_ACT) {
                const row: EditorLiveStructureRow = {
                    kind: 'act',
                    blockId,
                    name: node.textContent.trim(),
                    index: rows.length,
                };

                rows.push(row);
                rowIndexByBlockId.set(blockId, row.index);

                return false;
            }

            if (blockType === ELEMENT_SCENE_HEADING) {
                currentSceneBlockId = blockId;

                const row: EditorLiveStructureRow = {
                    kind: 'scene',
                    blockId,
                    title: normalizeText(node.textContent) || 'Untitled scene',
                    index: rows.length,
                };

                rows.push(row);
                rowIndexByBlockId.set(blockId, row.index);
                sceneByBlockId.set(blockId, blockId);

                return false;
            }

            if (currentSceneBlockId) {
                sceneByBlockId.set(blockId, currentSceneBlockId);
            }

            return false;
        });
    } catch {
        return EMPTY_STRUCTURE;
    }

    if (rows.length === 0 && sceneByBlockId.size === 0) {
        return EMPTY_STRUCTURE;
    }

    return {
        rows,
        rowIndexByBlockId,
        sceneByBlockId,
    };
};

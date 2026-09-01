import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import {
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../../tiptap/scriptCore';
import type {
    BlockActionContext,
    BlockActionItem,
} from './actionTypes';

/**
 * The first scene heading in document order can never be deleted (it anchors the
 * screenplay's opening scene). Resolved by walking the document top to bottom and
 * returning the id of the first `scene` block encountered.
 */
export const isFirstSceneBlock = (doc: ProseMirrorNode, blockId: string): boolean => {
    let firstSceneId: string | null = null;

    doc.descendants(node => {
        if (firstSceneId !== null) {
            return false;
        }

        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        if (normalizeBlockNodeType(node.attrs.blockType) === 'scene') {
            firstSceneId = typeof node.attrs.id === 'string' ? node.attrs.id : null;
        }

        return false;
    });

    return firstSceneId !== null && firstSceneId === blockId;
};

export const resolveSceneActions = (
    {
        editor, blockId, blockType,
    }: BlockActionContext,
): readonly BlockActionItem[] => {
    if (blockType !== 'scene') {
        return [];
    }

    if (isFirstSceneBlock(editor.state.doc, blockId)) {
        return [];
    }

    return [
        {
            kind: 'command',
            id: 'delete-scene-heading',
            label: 'Delete scene heading',
            icon: 'delete',
            run: () => {
                editor.commands.requestDeleteScene(blockId);
            },
        },
    ];
};

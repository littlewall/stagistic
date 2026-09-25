import {findScriptBlockByIdFromState} from '../../tiptap/scriptCore';
import type {BlockActionContext, BlockActionItem} from './actionTypes';

export const resolveCommentActions = ({editor, blockId}: BlockActionContext): readonly BlockActionItem[] => {
    // The mini editor has no comments extension.
    if (!editor.extensionManager.extensions.some(extension => extension.name === 'comments')) {
        return [];
    }

    return [
        {
            kind: 'command',
            id: 'comment-add',
            label: 'Add comment',
            detail: '⌘⌥M',
            icon: 'comment',
            run: () => {
                const block = findScriptBlockByIdFromState(editor.state, blockId);

                if (block) {
                    editor.chain().focus().setTextSelection(block.to).startCommentDraft().run();
                }
            },
        },
    ];
};

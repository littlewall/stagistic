import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEffect, useRef} from 'react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';

type UseEditorActiveBlockSyncArgs = {
    editor: TiptapEditor | null,
    onActiveBlockChange?: (blockId: string | null) => void,
    focusBlockRequest?: {
        blockId: string,
        requestId: number,
    } | null,
};

export const useEditorActiveBlockSync = ({
    editor,
    onActiveBlockChange,
    focusBlockRequest,
}: UseEditorActiveBlockSyncArgs) => {
    const lastFocusedRequestIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!editor || !onActiveBlockChange) {
            return;
        }

        const emitActiveBlock = () => {
            const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);
            const blockId = activeBlock?.id ?? null;

            onActiveBlockChange(blockId);
        };

        emitActiveBlock();
        editor.on('selectionUpdate', emitActiveBlock);
        editor.on('transaction', emitActiveBlock);

        return () => {
            editor.off('selectionUpdate', emitActiveBlock);
            editor.off('transaction', emitActiveBlock);
        };
    }, [editor, onActiveBlockChange]);

    useEffect(() => {
        if (!editor || !focusBlockRequest) {
            return;
        }

        if (lastFocusedRequestIdRef.current === focusBlockRequest.requestId) {
            return;
        }

        lastFocusedRequestIdRef.current = focusBlockRequest.requestId;

        let targetPos: number | null = null;

        editor.state.doc.descendants((node, pos) => {
            if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
                return true;
            }

            if (node.attrs.id !== focusBlockRequest.blockId) {
                return false;
            }

            targetPos = pos + 1;

            return false;
        });

        if (targetPos === null) {
            return;
        }

        editor
            .chain()
            .focus()
            .setTextSelection(targetPos)
            .run();
    }, [editor, focusBlockRequest]);
};

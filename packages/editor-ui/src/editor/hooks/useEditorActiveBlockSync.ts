import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEffect, useRef} from 'react';

import {
    findFountainBlockSelectionPosFromState,
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';

const ACTIVE_BLOCK_SYNC_SUPPRESSED_KEY = '__activeBlockSyncSuppressed';

export const setActiveBlockSyncSuppressed = (editor: TiptapEditor, suppressed: boolean) => {
    (editor.storage as unknown as Record<string, unknown>)[ACTIVE_BLOCK_SYNC_SUPPRESSED_KEY] = suppressed;
};

const isActiveBlockSyncSuppressed = (editor: TiptapEditor) => {
    return (editor.storage as unknown as Record<string, unknown>)[ACTIVE_BLOCK_SYNC_SUPPRESSED_KEY] === true;
};

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
    const emitFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!editor || !onActiveBlockChange) {
            return;
        }

        const emitActiveBlock = () => {
            if (emitFrameRef.current !== null) {
                return;
            }

            emitFrameRef.current = window.requestAnimationFrame(() => {
                emitFrameRef.current = null;

                if (isActiveBlockSyncSuppressed(editor)) {
                    return;
                }

                const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);
                const blockId = activeBlock?.id ?? null;

                onActiveBlockChange(blockId);
            });
        };

        emitActiveBlock();
        editor.on('selectionUpdate', emitActiveBlock);
        editor.on('transaction', emitActiveBlock);

        return () => {
            editor.off('selectionUpdate', emitActiveBlock);
            editor.off('transaction', emitActiveBlock);

            if (emitFrameRef.current !== null) {
                window.cancelAnimationFrame(emitFrameRef.current);
                emitFrameRef.current = null;
            }
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

        const targetPos = findFountainBlockSelectionPosFromState(editor.state, focusBlockRequest.blockId);

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

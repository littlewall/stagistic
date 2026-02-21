import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEffect, useRef} from 'react';

import type {FocusBlockRequest} from '../contracts';
import {getBlockUiEventsFromState} from '../tiptap/extensions';
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

interface UseEditorActiveBlockSyncArgs {
    editor: TiptapEditor | null,
    onActiveBlockChange?: (blockId: string | null) => void,
    focusBlockRequest?: FocusBlockRequest | null,
}

export const useEditorActiveBlockSync = ({
    editor,
    onActiveBlockChange,
    focusBlockRequest,
}: UseEditorActiveBlockSyncArgs) => {
    const lastFocusedRequestIdRef = useRef<number | null>(null);
    const lastEmittedBlockIdRef = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        if (!editor || !onActiveBlockChange) {
            return;
        }

        lastEmittedBlockIdRef.current = undefined;

        const emitActiveBlock = () => {
            if (isActiveBlockSyncSuppressed(editor)) {
                return;
            }

            const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);
            const blockId = activeBlock?.id ?? null;

            if (lastEmittedBlockIdRef.current === blockId) {
                return;
            }

            lastEmittedBlockIdRef.current = blockId;
            onActiveBlockChange(blockId);
        };

        emitActiveBlock();

        const handleTransaction = () => {
            const shouldEmit = getBlockUiEventsFromState(editor.state).some(event => event.type === 'activeBlockChange');

            if (!shouldEmit) {
                return;
            }

            emitActiveBlock();
        };

        editor.on('selectionUpdate', emitActiveBlock);
        editor.on('transaction', handleTransaction);

        return () => {
            editor.off('selectionUpdate', emitActiveBlock);
            editor.off('transaction', handleTransaction);
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

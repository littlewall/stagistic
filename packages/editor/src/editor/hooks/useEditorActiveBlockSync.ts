import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEffect, useRef} from 'react';

import {
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
}

export const useEditorActiveBlockSync = ({
    editor,
    onActiveBlockChange,
}: UseEditorActiveBlockSyncArgs) => {
    const lastEmittedBlockIdRef = useRef<string | null | undefined>(undefined);
    const syncedEditorRef = useRef<TiptapEditor | null>(null);

    useEffect(() => {
        if (!editor || !onActiveBlockChange) {
            return;
        }

        if (syncedEditorRef.current !== editor) {
            syncedEditorRef.current = editor;
            lastEmittedBlockIdRef.current = undefined;
        }

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
        if (editor) {
            return;
        }

        syncedEditorRef.current = null;
        lastEmittedBlockIdRef.current = undefined;
    }, [editor]);
};

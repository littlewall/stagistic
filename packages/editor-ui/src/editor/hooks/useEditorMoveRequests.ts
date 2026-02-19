import type {ScriptDocument} from '@stagistic/script-core';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useEffect, useRef,
} from 'react';

import {
    findFountainBlockSelectionPosFromState,
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';
import {moveActMarker, moveSceneSegment} from './structureReorder';
import {tryCommitDocument} from './structureRequestMutations';
import {setActiveBlockSyncSuppressed} from './useEditorActiveBlockSync';

type UseEditorMoveRequestsArgs = {
    editor: TiptapEditor | null,
    moveSceneRequest?: {
        sourceSceneBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    moveActRequest?: {
        sourceActBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument) => void) | undefined>,
    setLatestValue: (value: ScriptDocument) => void,
    scheduleAutosave: (value: ScriptDocument) => void,
};

export const useEditorMoveRequests = ({
    editor,
    moveSceneRequest,
    moveActRequest,
    onValueChangeRef,
    setLatestValue,
    scheduleAutosave,
}: UseEditorMoveRequestsArgs) => {
    const lastMoveSceneRequestIdRef = useRef<number | null>(null);
    const lastMoveActRequestIdRef = useRef<number | null>(null);
    const releaseSyncSuppressionFrameRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (releaseSyncSuppressionFrameRef.current === null) {
                return;
            }

            window.cancelAnimationFrame(releaseSyncSuppressionFrameRef.current);
            releaseSyncSuppressionFrameRef.current = null;
        };
    }, []);

    const restoreSelectionForBlock = (blockId: string | null) => {
        if (!editor || !blockId) {
            return;
        }

        const selectionPos = findFountainBlockSelectionPosFromState(editor.state, blockId);

        if (selectionPos === null) {
            return;
        }

        const tr = editor.state.tr
            .setSelection(TextSelection.near(editor.state.doc.resolve(selectionPos), 1))
            .setMeta('preventUpdate', true);

        editor.view.dispatch(tr);
    };

    const withActiveBlockPreserved = (
        callback: () => void,
    ) => {
        if (!editor) {
            return;
        }

        const activeBlockAtStart = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);
        const preservedBlockId = activeBlockAtStart?.id ?? null;

        setActiveBlockSyncSuppressed(editor, true);

        try {
            callback();
            restoreSelectionForBlock(preservedBlockId);
        } finally {
            if (releaseSyncSuppressionFrameRef.current !== null) {
                window.cancelAnimationFrame(releaseSyncSuppressionFrameRef.current);
            }

            releaseSyncSuppressionFrameRef.current = window.requestAnimationFrame(() => {
                releaseSyncSuppressionFrameRef.current = null;
                setActiveBlockSyncSuppressed(editor, false);
            });
        }
    };

    useEffect(() => {
        if (!editor || !moveSceneRequest) {
            return;
        }

        if (lastMoveSceneRequestIdRef.current === moveSceneRequest.requestId) {
            return;
        }

        lastMoveSceneRequestIdRef.current = moveSceneRequest.requestId;

        if (
            !moveSceneRequest.sourceSceneBlockId
            || moveSceneRequest.sourceSceneBlockId === moveSceneRequest.beforeBlockId
        ) {
            return;
        }

        const currentValue = editor.getJSON() as ScriptDocument;
        const [nextContent, didChange] = moveSceneSegment(
            currentValue.content,
            moveSceneRequest.sourceSceneBlockId,
            moveSceneRequest.beforeBlockId,
        );

        if (!didChange || !Array.isArray(nextContent)) {
            return;
        }

        withActiveBlockPreserved(() => {
            tryCommitDocument(
                editor,
                nextContent,
                didChange,
                setLatestValue,
                onValueChangeRef,
                scheduleAutosave,
            );
        });
    }, [
        editor,
        moveSceneRequest,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
        withActiveBlockPreserved,
    ]);

    useEffect(() => {
        if (!editor || !moveActRequest) {
            return;
        }

        if (lastMoveActRequestIdRef.current === moveActRequest.requestId) {
            return;
        }

        lastMoveActRequestIdRef.current = moveActRequest.requestId;

        if (
            !moveActRequest.sourceActBlockId
            || moveActRequest.sourceActBlockId === moveActRequest.beforeBlockId
        ) {
            return;
        }

        const currentValue = editor.getJSON() as ScriptDocument;
        const [nextContent, didChange] = moveActMarker(
            currentValue.content,
            moveActRequest.sourceActBlockId,
            moveActRequest.beforeBlockId,
        );

        if (!didChange || !Array.isArray(nextContent)) {
            return;
        }

        withActiveBlockPreserved(() => {
            tryCommitDocument(
                editor,
                nextContent,
                didChange,
                setLatestValue,
                onValueChangeRef,
                scheduleAutosave,
            );
        });
    }, [
        editor,
        moveActRequest,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
        withActiveBlockPreserved,
    ]);
};

import type {ScriptDocument} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useCallback, useEffect, useRef,
} from 'react';

import type {
    EditorIndexSnapshot,
    EditorStructureRequests,
    EditorValueChangeMeta,
} from '../contracts';
import {
    findFountainBlockSelectionPosFromState,
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';
import {moveActMarker, moveSceneSegment} from './structureReorder';
import {tryCommitDocument} from './structureRequestMutations';
import {type AutosaveSchedulePayload} from './useAutosaveController';
import {setActiveBlockSyncSuppressed} from './useEditorActiveBlockSync';

interface UseEditorMoveRequestsArgs {
    editor: TiptapEditor | null,
    requests?: Pick<EditorStructureRequests, 'moveSceneRequest' | 'moveActRequest'>,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
}

export const useEditorMoveRequests = ({
    editor,
    requests,
    onValueChangeRef,
    onIndexChangeRef,
    setLatestValue,
    scheduleAutosave,
    revisionRef,
}: UseEditorMoveRequestsArgs) => {
    const {
        moveSceneRequest,
        moveActRequest,
    } = requests ?? {};
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

    const restoreSelectionForBlock = useCallback((blockId: string | null) => {
        if (!editor || !blockId) {
            return;
        }

        const selectionPos = findFountainBlockSelectionPosFromState(editor.state, blockId);

        if (selectionPos === null) {
            return;
        }

        const tr = editor.state.tr
            .setSelection(TextSelection.near(editor.state.doc.resolve(selectionPos), 1))
            .setMeta('preventUpdate', true)
            .scrollIntoView();

        editor.view.dispatch(tr);
    }, [editor]);

    const withActiveBlockPreserved = useCallback((
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
    }, [editor, restoreSelectionForBlock]);

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
                onIndexChangeRef,
                scheduleAutosave,
                revisionRef,
            );
        });
    }, [
        editor,
        moveSceneRequest,
        onIndexChangeRef,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
        revisionRef,
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
                onIndexChangeRef,
                scheduleAutosave,
                revisionRef,
            );
        });
    }, [
        editor,
        moveActRequest,
        onIndexChangeRef,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
        revisionRef,
        withActiveBlockPreserved,
    ]);
};

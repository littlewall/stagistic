import {
    ELEMENT_ACT,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    type ScriptDocument,
} from '@stagistic/script';
import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useEffect, useMemo, useRef,
} from 'react';

import type {
    EditorIndexSnapshot,
    EditorStructureRequests,
    EditorValueChangeMeta,
} from '../contracts';
import {
    buildInsertActContent,
    type CommitContext,
    removeActBlockById,
    setPlainTextContent,
    tryCommitDocument,
} from './structureRequestMutations';
import {type AutosaveSchedulePayload} from './useAutosaveController';
import {useEditorMoveRequests} from './useEditorMoveRequests';

interface UseEditorStructureRequestsArgs {
    editor: TiptapEditor | null,
    requests?: EditorStructureRequests,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
}

export const useEditorStructureRequests = ({
    editor,
    requests,
    onValueChangeRef,
    onIndexChangeRef,
    setLatestValue,
    scheduleAutosave,
    revisionRef,
}: UseEditorStructureRequestsArgs) => {
    const {
        insertActRequest,
        renameActRequest,
        deleteActRequest,
        moveSceneRequest,
    } = requests ?? {};
    const lastInsertActRequestIdRef = useRef<number | null>(null);
    const lastRenameActRequestIdRef = useRef<number | null>(null);
    const lastDeleteActRequestIdRef = useRef<number | null>(null);

    const commitContext = useMemo<CommitContext | null>(() => {
        if (!editor) {
            return null;
        }

        return {
            editor, setLatestValue, onValueChangeRef, onIndexChangeRef, scheduleAutosave, revisionRef,
        };
    }, [
        editor,
        setLatestValue,
        onValueChangeRef,
        onIndexChangeRef,
        scheduleAutosave,
        revisionRef,
    ]);

    useEditorMoveRequests({
        commitContext,
        requests: {
            moveSceneRequest,
        },
    });

    useEffect(() => {
        if (!commitContext || !insertActRequest) {
            return;
        }

        if (lastInsertActRequestIdRef.current === insertActRequest.requestId) {
            return;
        }

        lastInsertActRequestIdRef.current = insertActRequest.requestId;

        const currentValue = commitContext.editor.getJSON() as ScriptDocument;
        const {nextContent, didChange} = buildInsertActContent(currentValue, insertActRequest.beforeBlockId);

        tryCommitDocument(commitContext, nextContent, didChange, currentValue.attrs);
    }, [commitContext, insertActRequest]);

    useEffect(() => {
        if (!commitContext || !renameActRequest) {
            return;
        }

        if (lastRenameActRequestIdRef.current === renameActRequest.requestId) {
            return;
        }

        lastRenameActRequestIdRef.current = renameActRequest.requestId;

        const normalizedName = renameActRequest.nextName.trim();

        if (!renameActRequest.blockId) {
            return;
        }

        const currentValue = commitContext.editor.getJSON() as ScriptDocument;
        const [nextContent, didChange] = setPlainTextContent(
            currentValue.content,
            renameActRequest.blockId,
            normalizedName,
        );

        tryCommitDocument(commitContext, nextContent, didChange, currentValue.attrs);
    }, [commitContext, renameActRequest]);

    useEffect(() => {
        if (!commitContext || !deleteActRequest) {
            return;
        }

        if (lastDeleteActRequestIdRef.current === deleteActRequest.requestId) {
            return;
        }

        lastDeleteActRequestIdRef.current = deleteActRequest.requestId;

        if (!deleteActRequest.blockId) {
            return;
        }

        const currentValue = commitContext.editor.getJSON() as ScriptDocument;
        const firstNode = currentValue.content?.[0];

        if (
            firstNode &&
            isScriptBlockNode(firstNode) &&
            getScriptBlockLegacyType(firstNode) === ELEMENT_ACT &&
            getScriptBlockId(firstNode) === deleteActRequest.blockId
        ) {
            return;
        }

        const [nextContent, didChange] = removeActBlockById(
            currentValue.content,
            deleteActRequest.blockId,
        );

        tryCommitDocument(commitContext, nextContent, didChange, currentValue.attrs);
    }, [commitContext, deleteActRequest]);
};

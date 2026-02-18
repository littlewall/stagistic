import type {ScriptDocument} from '@stagistic/script-core';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useEffect, useRef,
} from 'react';

import {moveActMarker, moveSceneSegment} from './structureReorder';
import {tryCommitDocument} from './structureRequestMutations';

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

        tryCommitDocument(
            editor,
            nextContent,
            didChange,
            setLatestValue,
            onValueChangeRef,
            scheduleAutosave,
        );
    }, [
        editor,
        moveSceneRequest,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
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

        tryCommitDocument(
            editor,
            nextContent,
            didChange,
            setLatestValue,
            onValueChangeRef,
            scheduleAutosave,
        );
    }, [
        editor,
        moveActRequest,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
    ]);
};

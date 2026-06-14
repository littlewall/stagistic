import {
    getScriptBlockId,
    getScriptBlockNodeType,
    isScriptBlockNode,
    type ScriptDocument,
} from '@stagistic/script';
import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useCallback, useMemo,
} from 'react';

import type {EditorIndexSnapshot, EditorValueChangeMeta} from '../contracts';
import {withActiveBlockPreserved} from '../hooks/selectionHelpers';
import {moveSceneSegment} from '../hooks/structureReorder';
import {
    buildInsertActContent,
    type CommitContext,
    removeActBlockById,
    setPlainTextContent,
    tryCommitDocument,
    tryCommitSceneReorder,
} from '../hooks/structureRequestMutations';
import {type AutosaveSchedulePayload} from '../hooks/useAutosaveController';
import type {EditorActCommands} from './context';

interface UseBuildActCommandsArgs {
    instance: TiptapEditor | null,
    onValueChangeRef: MutableRefObject<((value: ScriptDocument, meta?: EditorValueChangeMeta) => void) | undefined>,
    onIndexChangeRef: MutableRefObject<((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void) | undefined>,
    setLatestValue: (value: ScriptDocument, revision?: number) => void,
    scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    revisionRef: MutableRefObject<number>,
}

export const useBuildActCommands = ({
    instance,
    onValueChangeRef,
    onIndexChangeRef,
    setLatestValue,
    scheduleAutosave,
    revisionRef,
}: UseBuildActCommandsArgs): EditorActCommands => {
    const commitCtx = useMemo<CommitContext | null>(() => {
        if (!instance) {
            return null;
        }

        return {
            editor: instance, setLatestValue, onValueChangeRef, onIndexChangeRef, scheduleAutosave, revisionRef,
        };
    }, [
        instance,
        setLatestValue,
        onValueChangeRef,
        onIndexChangeRef,
        scheduleAutosave,
        revisionRef,
    ]);

    const insertAct = useCallback((beforeBlockId: string | null) => {
        if (!commitCtx) {
            return;
        }

        const currentValue = commitCtx.editor.getJSON() as ScriptDocument;
        const {nextContent, didChange} = buildInsertActContent(currentValue, beforeBlockId);

        tryCommitDocument(commitCtx, nextContent, didChange, currentValue.attrs);
    }, [commitCtx]);

    const renameAct = useCallback((blockId: string, nextName: string) => {
        if (!commitCtx || !blockId) {
            return;
        }

        const currentValue = commitCtx.editor.getJSON() as ScriptDocument;
        const [nextContent, didChange] = setPlainTextContent(currentValue.content, blockId, nextName.trim());

        tryCommitDocument(commitCtx, nextContent, didChange, currentValue.attrs);
    }, [commitCtx]);

    const deleteAct = useCallback((blockId: string) => {
        if (!commitCtx || !blockId) {
            return;
        }

        const currentValue = commitCtx.editor.getJSON() as ScriptDocument;
        const firstNode = currentValue.content?.[0];

        if (
            firstNode
            && isScriptBlockNode(firstNode)
            && getScriptBlockNodeType(firstNode) === "act"
            && getScriptBlockId(firstNode) === blockId
        ) {
            return;
        }

        const [nextContent, didChange] = removeActBlockById(currentValue.content, blockId);

        tryCommitDocument(commitCtx, nextContent, didChange, currentValue.attrs);
    }, [commitCtx]);

    const moveScene = useCallback((sourceSceneBlockId: string, beforeBlockId: string | null) => {
        if (!commitCtx || !sourceSceneBlockId || sourceSceneBlockId === beforeBlockId) {
            return;
        }

        const currentValue = commitCtx.editor.getJSON() as ScriptDocument;
        const [nextContent, didChange] = moveSceneSegment(
            currentValue.content,
            sourceSceneBlockId,
            beforeBlockId,
        );

        if (!didChange || !Array.isArray(nextContent)) {
            return;
        }

        withActiveBlockPreserved(commitCtx.editor, () => {
            tryCommitSceneReorder(
                commitCtx,
                sourceSceneBlockId,
                beforeBlockId,
                nextContent,
                didChange,
                currentValue.attrs,
            );
        });
    }, [commitCtx]);

    return {
        insertAct, renameAct, deleteAct, moveScene,
    };
};

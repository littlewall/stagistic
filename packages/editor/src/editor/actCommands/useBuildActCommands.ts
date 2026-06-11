import {
    ELEMENT_ACT,
    getScriptBlockId,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    type ScriptDocument,
} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    type MutableRefObject, useCallback, useMemo,
} from 'react';

import type {EditorIndexSnapshot, EditorValueChangeMeta} from '../contracts';
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
import {
    findFountainBlockSelectionPosFromState,
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';
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

    const restoreSelectionForBlock = useCallback((blockId: string | null) => {
        if (!commitCtx || !blockId) {
            return;
        }

        const {editor} = commitCtx;
        const selectionPos = findFountainBlockSelectionPosFromState(editor.state, blockId);

        if (selectionPos === null) {
            return;
        }

        const tr = editor.state.tr
            .setSelection(TextSelection.near(editor.state.doc.resolve(selectionPos), 1))
            .setMeta('preventUpdate', true)
            .scrollIntoView();

        editor.view.dispatch(tr);
    }, [commitCtx]);

    const withActiveBlockPreserved = useCallback((callback: () => void) => {
        if (!commitCtx) {
            return;
        }

        const {editor} = commitCtx;
        const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);
        const preservedBlockId = activeBlock?.id ?? null;

        callback();
        restoreSelectionForBlock(preservedBlockId);
    }, [commitCtx, restoreSelectionForBlock]);

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

        const currentValue = instance.getJSON() as ScriptDocument;
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
            && getScriptBlockLegacyType(firstNode) === ELEMENT_ACT
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

        withActiveBlockPreserved(() => {
            tryCommitSceneReorder(
                commitCtx,
                sourceSceneBlockId,
                beforeBlockId,
                nextContent,
                didChange,
                currentValue.attrs,
            );
        });
    }, [commitCtx, withActiveBlockPreserved]);

    return {
        insertAct, renameAct, deleteAct, moveScene,
    };
};

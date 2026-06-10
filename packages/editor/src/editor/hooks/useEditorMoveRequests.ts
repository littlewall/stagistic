import type {ScriptDocument} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import {
    useCallback, useEffect, useRef,
} from 'react';

import type {EditorStructureRequests} from '../contracts';
import {
    findFountainBlockSelectionPosFromState,
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';
import {moveSceneSegment} from './structureReorder';
import {type CommitContext, tryCommitSceneReorder} from './structureRequestMutations';

interface UseEditorMoveRequestsArgs {
    commitContext: CommitContext | null,
    requests?: Pick<EditorStructureRequests, 'moveSceneRequest'>,
}

export const useEditorMoveRequests = ({
    commitContext,
    requests,
}: UseEditorMoveRequestsArgs) => {
    const {
        moveSceneRequest,
    } = requests ?? {};
    const lastMoveSceneRequestIdRef = useRef<number | null>(null);

    const restoreSelectionForBlock = useCallback((blockId: string | null) => {
        if (!commitContext || !blockId) {
            return;
        }

        const {editor} = commitContext;
        const selectionPos = findFountainBlockSelectionPosFromState(editor.state, blockId);

        if (selectionPos === null) {
            return;
        }

        const tr = editor.state.tr
            .setSelection(TextSelection.near(editor.state.doc.resolve(selectionPos), 1))
            .setMeta('preventUpdate', true)
            .scrollIntoView();

        editor.view.dispatch(tr);
    }, [commitContext]);

    const withActiveBlockPreserved = useCallback((
        callback: () => void,
    ) => {
        if (!commitContext) {
            return;
        }

        const {editor} = commitContext;
        const activeBlockAtStart = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);
        const preservedBlockId = activeBlockAtStart?.id ?? null;

        callback();
        restoreSelectionForBlock(preservedBlockId);
    }, [commitContext, restoreSelectionForBlock]);

    useEffect(() => {
        if (!commitContext || !moveSceneRequest) {
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

        const currentValue = commitContext.editor.getJSON() as ScriptDocument;
        const [nextContent, didChange] = moveSceneSegment(
            currentValue.content,
            moveSceneRequest.sourceSceneBlockId,
            moveSceneRequest.beforeBlockId,
        );

        if (!didChange || !Array.isArray(nextContent)) {
            return;
        }

        withActiveBlockPreserved(() => {
            tryCommitSceneReorder(
                commitContext,
                moveSceneRequest.sourceSceneBlockId,
                moveSceneRequest.beforeBlockId,
                nextContent,
                didChange,
                currentValue.attrs,
            );
        });
    }, [
        commitContext,
        moveSceneRequest,
        withActiveBlockPreserved,
    ]);
};

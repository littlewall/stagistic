import type {ScriptDocument} from '@stagistic/script';
import {useEffect, useRef} from 'react';

import type {EditorStructureRequests} from '../contracts';
import {withActiveBlockPreserved} from './selectionHelpers';
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

        withActiveBlockPreserved(commitContext.editor, () => {
            tryCommitSceneReorder(
                commitContext,
                moveSceneRequest.sourceSceneBlockId,
                moveSceneRequest.beforeBlockId,
                nextContent,
                didChange,
                currentValue.attrs,
            );
        });
    }, [commitContext, moveSceneRequest]);
};

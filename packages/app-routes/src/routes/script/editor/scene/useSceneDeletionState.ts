import type {DeleteSceneRequest} from '@stagistic/editor';
import {
    useCallback,
    useRef,
    useState,
} from 'react';

interface SceneDeletionState {
    pendingSceneDelete: {blockId: string} | null,
    deleteSceneRequest: DeleteSceneRequest | null,
    requestDeleteScene: (sceneHeadingBlockId: string) => void,
    closeSceneDeleteModal: () => void,
    confirmDeleteScene: () => void,
}

/**
 * Owns the block-action / attribute-manager scene-heading delete handshake:
 * a request opens the confirmation modal, and confirming raises a
 * `DeleteSceneRequest` (numeric, deduped requestId) that the editor fulfils.
 */
export const useSceneDeletionState = (): SceneDeletionState => {
    const [pendingSceneDelete, setPendingSceneDelete] = useState<{blockId: string} | null>(null);
    const [deleteSceneRequest, setDeleteSceneRequest] = useState<DeleteSceneRequest | null>(null);
    const deleteSceneRequestIdRef = useRef(0);

    const requestDeleteScene = useCallback((sceneHeadingBlockId: string) => {
        setPendingSceneDelete({blockId: sceneHeadingBlockId});
    }, []);
    const closeSceneDeleteModal = useCallback(() => {
        setPendingSceneDelete(null);
    }, []);
    const confirmDeleteScene = useCallback(() => {
        if (!pendingSceneDelete) {
            return;
        }

        const requestId = deleteSceneRequestIdRef.current + 1;

        deleteSceneRequestIdRef.current = requestId;
        setDeleteSceneRequest({
            sceneHeadingBlockId: pendingSceneDelete.blockId,
            requestId,
        });
        setPendingSceneDelete(null);
    }, [pendingSceneDelete]);

    return {
        pendingSceneDelete,
        deleteSceneRequest,
        requestDeleteScene,
        closeSceneDeleteModal,
        confirmDeleteScene,
    };
};

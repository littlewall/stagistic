import type {
    BlockNodeType,
    ConvertSceneRequest,
} from '@stagistic/editor';
import {
    useCallback,
    useRef,
    useState,
} from 'react';

interface PendingSceneConversion {
    blockId: string,
    targetBlockType: BlockNodeType,
}

interface SceneConversionState {
    pendingSceneConversion: PendingSceneConversion | null,
    convertSceneRequest: ConvertSceneRequest | null,
    requestConvertScene: (sceneHeadingBlockId: string, targetBlockType: BlockNodeType) => void,
    closeSceneConvertModal: () => void,
    confirmConvertScene: () => void,
}

/**
 * Owns the scene-heading conversion handshake: a request (raised from any
 * conversion path — block menu, toolbar, keyboard shortcut, Tab) opens the
 * confirmation modal, and confirming raises a `ConvertSceneRequest` (numeric,
 * deduped requestId) that the editor fulfils. Mirrors {@link useSceneDeletionState}.
 */
export const useSceneConversionState = (): SceneConversionState => {
    const [pendingSceneConversion, setPendingSceneConversion] = useState<PendingSceneConversion | null>(null);
    const [convertSceneRequest, setConvertSceneRequest] = useState<ConvertSceneRequest | null>(null);
    const convertSceneRequestIdRef = useRef(0);

    const requestConvertScene = useCallback((sceneHeadingBlockId: string, targetBlockType: BlockNodeType) => {
        setPendingSceneConversion({blockId: sceneHeadingBlockId, targetBlockType});
    }, []);
    const closeSceneConvertModal = useCallback(() => {
        setPendingSceneConversion(null);
    }, []);
    const confirmConvertScene = useCallback(() => {
        if (!pendingSceneConversion) {
            return;
        }

        const requestId = convertSceneRequestIdRef.current + 1;

        convertSceneRequestIdRef.current = requestId;
        setConvertSceneRequest({
            sceneHeadingBlockId: pendingSceneConversion.blockId,
            targetBlockType: pendingSceneConversion.targetBlockType,
            requestId,
        });
        setPendingSceneConversion(null);
    }, [pendingSceneConversion]);

    return {
        pendingSceneConversion,
        convertSceneRequest,
        requestConvertScene,
        closeSceneConvertModal,
        confirmConvertScene,
    };
};

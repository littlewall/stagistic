import {
    collectStructureBlocks,
    ELEMENT_ACT,
    type ScriptDocument,
} from '@stagistic/script-core';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

type ActiveBlockRepository = {
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<unknown>,
};

type UseStructureSidebarControllerArgs = {
    currentScriptId: string | null,
    scriptRepository: ActiveBlockRepository,
    sourceValue: ScriptDocument | null | undefined,
};

export const useStructureSidebarController = ({
    currentScriptId,
    scriptRepository,
    sourceValue,
}: UseStructureSidebarControllerArgs) => {
    const [focusBlockRequest, setFocusBlockRequest] = useState<{blockId: string, requestId: number} | null>(null);
    const [insertActRequest, setInsertActRequest] = useState<{
        beforeBlockId: string | null,
        requestId: number,
    } | null>(null);
    const [renameActRequest, setRenameActRequest] = useState<{
        blockId: string,
        nextName: string,
        requestId: number,
    } | null>(null);
    const [deleteActRequest, setDeleteActRequest] = useState<{
        blockId: string,
        requestId: number,
    } | null>(null);
    const [moveSceneRequest, setMoveSceneRequest] = useState<{
        sourceSceneBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null>(null);
    const [moveActRequest, setMoveActRequest] = useState<{
        sourceActBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null>(null);
    const [actNamePreviewById, setActNamePreviewById] = useState<Record<string, string>>({});
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const focusRequestCounterRef = useRef(0);
    const insertActRequestCounterRef = useRef(0);
    const renameActRequestCounterRef = useRef(0);
    const deleteActRequestCounterRef = useRef(0);
    const moveSceneRequestCounterRef = useRef(0);
    const moveActRequestCounterRef = useRef(0);
    const lastPersistedActiveBlockIdRef = useRef<string | null>(null);

    useEffect(() => {
        setActiveBlockId(null);
        setFocusBlockRequest(null);
        setInsertActRequest(null);
        setRenameActRequest(null);
        setDeleteActRequest(null);
        setMoveSceneRequest(null);
        setMoveActRequest(null);
        setActNamePreviewById({});
        lastPersistedActiveBlockIdRef.current = null;
    }, [currentScriptId]);

    useEffect(() => {
        if (!sourceValue) {
            return;
        }

        setActNamePreviewById(previous => {
            const previewEntries = Object.entries(previous);

            if (previewEntries.length === 0) {
                return previous;
            }

            const persistedActNameByKey = new Map<string, string>();
            const blocks = collectStructureBlocks(sourceValue.content);

            blocks.forEach(block => {
                if (block.blockType !== ELEMENT_ACT) {
                    return;
                }

                persistedActNameByKey.set(block.id, block.text.toLocaleUpperCase());
            });

            const next = {...previous};
            let didChange = false;

            previewEntries.forEach(([actId, previewName]) => {
                const normalizedPreviewName = previewName.toLocaleUpperCase().trim();
                const persistedActName = persistedActNameByKey.get(actId);

                if (persistedActName === undefined || persistedActName === normalizedPreviewName) {
                    delete next[actId];
                    didChange = true;
                }
            });

            return didChange ? next : previous;
        });
    }, [sourceValue]);

    const handleSidebarFocusBlock = useCallback((blockId: string) => {
        focusRequestCounterRef.current += 1;
        setFocusBlockRequest({
            blockId,
            requestId: focusRequestCounterRef.current,
        });
    }, []);

    const handleSidebarRenameAct = useCallback((blockId: string, nextName: string) => {
        const normalizedName = nextName.toLocaleUpperCase().trim();

        setActNamePreviewById(previous => {
            return {
                ...previous,
                [blockId]: normalizedName,
            };
        });
        renameActRequestCounterRef.current += 1;
        setRenameActRequest({
            blockId,
            nextName: normalizedName,
            requestId: renameActRequestCounterRef.current,
        });
    }, []);

    const handleActNamePreview = useCallback((blockId: string, nextName: string) => {
        const normalizedName = nextName.toLocaleUpperCase();

        setActNamePreviewById(previous => {
            return {
                ...previous,
                [blockId]: normalizedName,
            };
        });
    }, []);

    const handleSidebarDeleteAct = useCallback((blockId: string) => {
        setActNamePreviewById(previous => {
            const next = {...previous};

            delete next[blockId];

            return next;
        });
        deleteActRequestCounterRef.current += 1;
        setDeleteActRequest({
            blockId,
            requestId: deleteActRequestCounterRef.current,
        });
    }, []);

    const handleSidebarInsertAct = useCallback(() => {
        insertActRequestCounterRef.current += 1;
        setInsertActRequest({
            beforeBlockId: activeBlockId,
            requestId: insertActRequestCounterRef.current,
        });
    }, [activeBlockId]);

    const handleSidebarReorderScene = useCallback((
        sourceSceneBlockId: string,
        beforeBlockId: string | null,
    ) => {
        moveSceneRequestCounterRef.current += 1;
        setMoveSceneRequest({
            sourceSceneBlockId,
            beforeBlockId,
            requestId: moveSceneRequestCounterRef.current,
        });
    }, []);

    const handleSidebarReorderAct = useCallback((
        sourceActBlockId: string,
        beforeBlockId: string | null,
    ) => {
        moveActRequestCounterRef.current += 1;
        setMoveActRequest({
            sourceActBlockId,
            beforeBlockId,
            requestId: moveActRequestCounterRef.current,
        });
    }, []);

    const handleActiveBlockChange = useCallback((blockId: string | null) => {
        setActiveBlockId(previous => {
            return previous === blockId ? previous : blockId;
        });

        if (!currentScriptId || lastPersistedActiveBlockIdRef.current === blockId) {
            return;
        }

        lastPersistedActiveBlockIdRef.current = blockId;
        void scriptRepository.setActiveBlock(currentScriptId, blockId);
    }, [currentScriptId, scriptRepository]);

    return {
        focusBlockRequest,
        insertActRequest,
        renameActRequest,
        deleteActRequest,
        moveSceneRequest,
        moveActRequest,
        actNamePreviewById,
        activeBlockId,
        handleSidebarFocusBlock,
        handleSidebarRenameAct,
        handleActNamePreview,
        handleSidebarDeleteAct,
        handleSidebarInsertAct,
        handleSidebarReorderScene,
        handleSidebarReorderAct,
        handleActiveBlockChange,
    };
};

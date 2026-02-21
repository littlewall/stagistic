import type {
    DeleteActRequest,
    FocusBlockRequest,
    InsertActRequest,
    MoveActRequest,
    MoveSceneRequest,
    RenameActRequest,
} from '@stagistic/editor-ui';
import {
    collectStructureBlocks,
    ELEMENT_ACT,
} from '@stagistic/script-core';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {UseStructureSidebarControllerArgs} from './types';

const ACTIVE_BLOCK_PERSIST_DELAY_MS = 250;

export const useStructureSidebarController = ({
    currentScriptId,
    scriptRepository,
    sourceValue,
}: UseStructureSidebarControllerArgs) => {
    const [focusBlockRequest, setFocusBlockRequest] = useState<FocusBlockRequest | null>(null);
    const [insertActRequest, setInsertActRequest] = useState<InsertActRequest | null>(null);
    const [renameActRequest, setRenameActRequest] = useState<RenameActRequest | null>(null);
    const [deleteActRequest, setDeleteActRequest] = useState<DeleteActRequest | null>(null);
    const [moveSceneRequest, setMoveSceneRequest] = useState<MoveSceneRequest | null>(null);
    const [moveActRequest, setMoveActRequest] = useState<MoveActRequest | null>(null);
    const [actNamePreviewById, setActNamePreviewById] = useState<Record<string, string>>({});
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const focusRequestCounterRef = useRef(0);
    const insertActRequestCounterRef = useRef(0);
    const renameActRequestCounterRef = useRef(0);
    const deleteActRequestCounterRef = useRef(0);
    const moveSceneRequestCounterRef = useRef(0);
    const moveActRequestCounterRef = useRef(0);
    const lastPersistedActiveBlockIdRef = useRef<string | null>(null);
    const pendingPersistScriptIdRef = useRef<string | null>(null);
    const pendingPersistBlockIdRef = useRef<string | null>(null);
    const persistTimerRef = useRef<number | null>(null);

    const clearPendingPersistTimer = useCallback(() => {
        if (persistTimerRef.current === null) {
            return;
        }

        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
    }, []);

    const flushPendingActiveBlockPersist = useCallback(() => {
        clearPendingPersistTimer();

        const scriptId = pendingPersistScriptIdRef.current;
        const blockId = pendingPersistBlockIdRef.current;

        pendingPersistScriptIdRef.current = null;
        pendingPersistBlockIdRef.current = null;

        if (!scriptId || lastPersistedActiveBlockIdRef.current === blockId) {
            return;
        }

        lastPersistedActiveBlockIdRef.current = blockId;
        void scriptRepository.setActiveBlock(scriptId, blockId);
    }, [clearPendingPersistTimer, scriptRepository]);

    useEffect(() => {
        flushPendingActiveBlockPersist();
        setActiveBlockId(null);
        setFocusBlockRequest(null);
        setInsertActRequest(null);
        setRenameActRequest(null);
        setDeleteActRequest(null);
        setMoveSceneRequest(null);
        setMoveActRequest(null);
        setActNamePreviewById({});
        lastPersistedActiveBlockIdRef.current = null;
    }, [currentScriptId, flushPendingActiveBlockPersist]);

    useEffect(() => {
        return () => {
            flushPendingActiveBlockPersist();
        };
    }, [flushPendingActiveBlockPersist]);

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

        pendingPersistScriptIdRef.current = currentScriptId;
        pendingPersistBlockIdRef.current = blockId;
        clearPendingPersistTimer();

        persistTimerRef.current = window.setTimeout(() => {
            persistTimerRef.current = null;
            flushPendingActiveBlockPersist();
        }, ACTIVE_BLOCK_PERSIST_DELAY_MS);
    }, [
        clearPendingPersistTimer,
        currentScriptId,
        flushPendingActiveBlockPersist,
    ]);

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

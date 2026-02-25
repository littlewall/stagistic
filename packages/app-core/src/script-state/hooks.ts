import type {
    ScriptBlockIndexSnapshot,
    ScriptDocument,
} from '@stagistic/script-core';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {BlockSyncController} from './controller';
import {
    deleteActInDocument,
    insertActInDocument,
    moveActInDocument,
    moveSceneInDocument,
    renameActInDocument,
} from './documentMutations';
import type {
    PersistLatestFn,
    ScriptStateRepository,
    ScriptStateSidebarTab,
} from './types';

interface UseScriptStateArgs {
    enabled: boolean,
    scriptId: string | null,
    initialValue: ScriptDocument | null | undefined,
    repository: ScriptStateRepository,
    persistLatest?: PersistLatestFn,
    waitMs?: number,
    maxWaitMs?: number,
}

export interface ScriptStateApi {
    controller: BlockSyncController | null,
    editorOverrideValue: ScriptDocument | null,
    indexSnapshot: ScriptBlockIndexSnapshot | null,
    onEditorValueChange: (value: ScriptDocument) => void,
    onActiveBlockChange: (blockId: string | null) => void,
    onRenameAct: (blockId: string, nextName: string) => void,
    onDeleteAct: (blockId: string) => void,
    onInsertAct: () => void,
    onReorderScene: (sourceSceneBlockId: string, beforeBlockId: string | null) => void,
    onReorderAct: (sourceActBlockId: string, beforeBlockId: string | null) => void,
    setSidebarTab: (tab: ScriptStateSidebarTab) => void,
    setScrollPosition: (position: number) => void,
    flushNow: () => Promise<void>,
}

const EMPTY_ASYNC = async () => {};

export const useScriptState = ({
    enabled,
    scriptId,
    initialValue,
    repository,
    persistLatest,
    waitMs,
    maxWaitMs,
}: UseScriptStateArgs): ScriptStateApi => {
    const repositoryRef = useRef(repository);
    const persistLatestRef = useRef(persistLatest);

    useEffect(() => {
        repositoryRef.current = repository;
    }, [repository]);

    useEffect(() => {
        persistLatestRef.current = persistLatest;
    }, [persistLatest]);

    const repositoryBridge = useMemo<ScriptStateRepository>(() => ({
        saveLatest: (nextScriptId, value) => repositoryRef.current.saveLatest(nextScriptId, value),
        setActiveBlock: (nextScriptId, blockId) => repositoryRef.current.setActiveBlock(nextScriptId, blockId),
    }), []);
    const persistLatestBridge = useCallback<PersistLatestFn>((value: ScriptDocument) => {
        const handler = persistLatestRef.current;

        if (!handler) {
            return Promise.resolve(true);
        }

        return handler(value);
    }, []);
    const hasPersistLatest = Boolean(persistLatest);
    const controller = useMemo(() => {
        if (!enabled || !scriptId) {
            return null;
        }

        return new BlockSyncController({
            scriptId,
            repository: repositoryBridge,
            persistLatest: hasPersistLatest ? persistLatestBridge : undefined,
            waitMs,
            maxWaitMs,
        });
    }, [
        enabled,
        hasPersistLatest,
        maxWaitMs,
        persistLatestBridge,
        repositoryBridge,
        scriptId,
        waitMs,
    ]);
    const [editorOverrideValue, setEditorOverrideValue] = useState<ScriptDocument | null>(null);
    const [indexSnapshot, setIndexSnapshot] = useState<ScriptBlockIndexSnapshot | null>(null);

    useEffect(() => {
        return () => {
            if (!controller) {
                return;
            }

            void controller.flushNow();
            controller.dispose();
        };
    }, [controller]);

    useEffect(() => {
        if (!controller || !initialValue) {
            setEditorOverrideValue(null);
            setIndexSnapshot(null);

            return;
        }

        controller.hydrate(initialValue);
        setEditorOverrideValue(null);
        setIndexSnapshot(controller.getIndexSnapshot());
    }, [controller, initialValue]);

    const applyDocumentMutation = useCallback((
        mutator: (value: ScriptDocument) => ScriptDocument | null,
    ) => {
        if (!controller) {
            return;
        }

        const nextValue = controller.applyDocumentMutation(mutator);

        if (!nextValue) {
            return;
        }

        setEditorOverrideValue(nextValue);
        setIndexSnapshot(controller.getIndexSnapshot());
    }, [controller]);

    const onEditorValueChange = useCallback((value: ScriptDocument) => {
        if (!controller) {
            return;
        }

        controller.applyEditorValue(value);
        setIndexSnapshot(controller.getIndexSnapshot());
    }, [controller]);

    const onActiveBlockChange = useCallback((blockId: string | null) => {
        if (!controller) {
            return;
        }

        controller.setActiveBlockId(blockId);
    }, [controller]);

    const onRenameAct = useCallback((blockId: string, nextName: string) => {
        applyDocumentMutation(value => renameActInDocument(value, blockId, nextName));
    }, [applyDocumentMutation]);

    const onDeleteAct = useCallback((blockId: string) => {
        applyDocumentMutation(value => deleteActInDocument(value, blockId));
    }, [applyDocumentMutation]);

    const onInsertAct = useCallback(() => {
        applyDocumentMutation(value => {
            const activeBlockId = controller?.getUiSnapshot().activeBlockId ?? null;

            return insertActInDocument(value, activeBlockId);
        });
    }, [applyDocumentMutation, controller]);

    const onReorderScene = useCallback((sourceSceneBlockId: string, beforeBlockId: string | null) => {
        applyDocumentMutation(value => moveSceneInDocument(value, sourceSceneBlockId, beforeBlockId));
    }, [applyDocumentMutation]);

    const onReorderAct = useCallback((sourceActBlockId: string, beforeBlockId: string | null) => {
        applyDocumentMutation(value => moveActInDocument(value, sourceActBlockId, beforeBlockId));
    }, [applyDocumentMutation]);

    const setSidebarTab = useCallback((tab: ScriptStateSidebarTab) => {
        if (!controller) {
            return;
        }

        controller.setSidebarTab(tab);
    }, [controller]);

    const setScrollPosition = useCallback((position: number) => {
        if (!controller) {
            return;
        }

        controller.setScrollPosition(position);
    }, [controller]);

    const flushNow = useCallback(() => {
        if (!controller) {
            return EMPTY_ASYNC();
        }

        return controller.flushNow();
    }, [controller]);

    return {
        controller,
        editorOverrideValue,
        indexSnapshot,
        onEditorValueChange,
        onActiveBlockChange,
        onRenameAct,
        onDeleteAct,
        onInsertAct,
        onReorderScene,
        onReorderAct,
        setSidebarTab,
        setScrollPosition,
        flushNow,
    };
};

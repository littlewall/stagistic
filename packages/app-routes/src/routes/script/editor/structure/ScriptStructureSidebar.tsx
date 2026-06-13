import {
    Accessibility,
    Feedback,
    PointerSensor,
} from '@dnd-kit/dom';
import {DragDropProvider} from '@dnd-kit/react';
import {
    useEditorActCommands,
    useEditorLiveActiveBlock,
    useEditorLiveStructure,
    useFocusEditorBlock,
} from '@stagistic/editor';
import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {useScriptSession} from '../../ScriptSessionContext';
import styles from './ScriptStructureSidebar.module.css';
import {
    buildAccessibilityPlugin,
    configuredPointerSensor,
    feedbackWithoutDropAnimation,
} from './structureDndConfig';
import {StructureRowAct, StructureRowActStatic} from './StructureRowAct';
import {
    deriveStructureStateFromIndex,
    deriveStructureStateFromLive,
    resolveActiveSceneBlockId,
    ROOT_ACT_GROUP,
    type SceneItem,
} from './structureRows';
import {StructureRowScene} from './StructureRowScene';
import {useStructureSidebarDnd} from './useStructureSidebarDnd';

const ACTIVE_BLOCK_PERSIST_DELAY_MS = 250;

export const ScriptStructureSidebar = () => {
    const {
        currentScriptId, scriptRepository, indexSnapshot,
    } = useScriptSession();
    const actCommands = useEditorActCommands();
    const liveStructure = useEditorLiveStructure();
    const liveActiveBlockId = useEditorLiveActiveBlock();
    const focusBlock = useFocusEditorBlock();

    // ── Local state ──────────────────────────────────────────────────────────
    const [actNamePreviewById, setActNamePreviewById] = useState<Record<string, string>>({});

    // ── Active block persistence (debounced) ─────────────────────────────────
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

    // Flush on unmount
    useEffect(() => () => {
        flushPendingActiveBlockPersist();
    }, [flushPendingActiveBlockPersist]);

    // Reset + flush on script change
    useEffect(() => {
        flushPendingActiveBlockPersist();
        lastPersistedActiveBlockIdRef.current = null;
        setActNamePreviewById({});
    }, [currentScriptId, flushPendingActiveBlockPersist]);

    // Debounced persist on active block change
    useEffect(() => {
        if (!currentScriptId || lastPersistedActiveBlockIdRef.current === liveActiveBlockId) {
            return;
        }

        pendingPersistScriptIdRef.current = currentScriptId;
        pendingPersistBlockIdRef.current = liveActiveBlockId;
        clearPendingPersistTimer();

        persistTimerRef.current = window.setTimeout(() => {
            persistTimerRef.current = null;
            flushPendingActiveBlockPersist();
        }, ACTIVE_BLOCK_PERSIST_DELAY_MS);
    }, [
        clearPendingPersistTimer,
        currentScriptId,
        flushPendingActiveBlockPersist,
        liveActiveBlockId,
    ]);

    // ── Structure state ───────────────────────────────────────────────────────
    const state = useMemo(() => {
        if (liveStructure.rows.length > 0) {
            return deriveStructureStateFromLive(liveStructure);
        }

        return deriveStructureStateFromIndex(indexSnapshot);
    }, [indexSnapshot, liveStructure]);

    const {groups} = state;

    const activeSceneBlockId = useMemo(
        () => resolveActiveSceneBlockId(state, liveActiveBlockId),
        [liveActiveBlockId, state],
    );

    const firstActBlockId = useMemo(() => {
        for (const group of groups) {
            if (group.groupId !== ROOT_ACT_GROUP) {
                return group.groupId;
            }
        }

        return null;
    }, [groups]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleRenameAct = useCallback((blockId: string, nextName: string) => {
        const trimmedName = nextName.trim();

        setActNamePreviewById(prev => ({...prev, [blockId]: trimmedName}));
        actCommands.renameAct(blockId, trimmedName);
    }, [actCommands]);

    const handleActNamePreview = useCallback((blockId: string, nextName: string) => {
        setActNamePreviewById(prev => ({...prev, [blockId]: nextName.trim()}));
    }, []);

    const handleDeleteAct = useCallback((blockId: string) => {
        setActNamePreviewById(prev => {
            const next = {...prev};

            delete next[blockId];

            return next;
        });
        actCommands.deleteAct(blockId);
    }, [actCommands]);

    const handleReorderScene = useCallback((sourceSceneBlockId: string, beforeBlockId: string | null) => {
        actCommands.moveScene(sourceSceneBlockId, beforeBlockId);
    }, [actCommands]);

    // ── DnD ───────────────────────────────────────────────────────────────────
    const handleDragEnd = useStructureSidebarDnd({
        groups,
        onReorderScene: handleReorderScene,
    });

    const handleSceneFocus = useCallback((id: string) => focusBlock(id), [focusBlock]);

    const sceneByBlockId = useMemo(() => {
        const map = new Map<string, SceneItem>();

        for (const group of groups) {
            for (const scene of group.scenes) {
                map.set(scene.blockId, scene);
            }
        }

        return map;
    }, [groups]);

    const accessibilityPlugin = useMemo(
        () => buildAccessibilityPlugin(sceneByBlockId),
        [sceneByBlockId],
    );

    const plugins = useCallback(
        (defaults: readonly unknown[]) => [
            ...defaults.filter(p => p !== Accessibility && p !== Feedback),
            accessibilityPlugin,
            feedbackWithoutDropAnimation,
        ],
        [accessibilityPlugin],
    );

    const sensors = useCallback(
        (defaults: readonly unknown[]) => [...defaults.filter(s => s !== PointerSensor), configuredPointerSensor],
        [],
    );

    const hasContent = groups.some(g => g.groupId !== ROOT_ACT_GROUP || g.scenes.length > 0);

    return (
        <div className={styles.content}>
            <DragDropProvider
                onDragEnd={handleDragEnd}
                plugins={plugins as never}
                sensors={sensors as never}
            >
                {!hasContent ? (
                    <p className={styles.empty}>
                        Structure outline will appear after adding Scene headings or ACT blocks.
                    </p>
                ) : (
                    <ul className={styles.itemList}>
                        {groups.map(group => {
                            const isActGroup = group.groupId !== ROOT_ACT_GROUP;
                            const isFirstAct = group.groupId === firstActBlockId;
                            const hasActAnchor = isActGroup && !isFirstAct;
                            const sceneIndexOffset = hasActAnchor ? 1 : 0;

                            return (
                                <Fragment key={group.groupId}>
                                    {isActGroup && (
                                        isFirstAct ? (
                                            <StructureRowActStatic
                                                blockId={group.groupId}
                                                name={group.actName ?? ''}
                                                isFirstAct
                                                namePreview={actNamePreviewById[group.groupId]}
                                                onRename={handleRenameAct}
                                                onNamePreview={handleActNamePreview}
                                                onDelete={handleDeleteAct}
                                            />
                                        ) : (
                                            <StructureRowAct
                                                blockId={group.groupId}
                                                index={0}
                                                name={group.actName ?? ''}
                                                isFirstAct={false}
                                                namePreview={actNamePreviewById[group.groupId]}
                                                onRename={handleRenameAct}
                                                onNamePreview={handleActNamePreview}
                                                onDelete={handleDeleteAct}
                                            />
                                        )
                                    )}
                                    {group.scenes.map((scene, idx) => (
                                        <StructureRowScene
                                            key={scene.blockId}
                                            blockId={scene.blockId}
                                            title={scene.title}
                                            index={idx + sceneIndexOffset}
                                            groupId={group.groupId}
                                            isActive={scene.blockId === activeSceneBlockId}
                                            onFocus={handleSceneFocus}
                                        />
                                    ))}
                                </Fragment>
                            );
                        })}
                    </ul>
                )}
            </DragDropProvider>
        </div>
    );
};

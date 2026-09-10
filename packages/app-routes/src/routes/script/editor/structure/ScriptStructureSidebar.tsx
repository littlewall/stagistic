import {
    Accessibility,
    Feedback,
    KeyboardSensor,
    PointerSensor,
} from '@dnd-kit/dom';
import {DragDropProvider} from '@dnd-kit/react';
import {useScriptActions} from '@stagistic/app-core';
import {
    useEditorActCommands,
    useEditorLiveActiveBlock,
    useEditorLiveScenePlacement,
    useEditorLiveStructure,
    useFocusEditorBlock,
} from '@stagistic/editor';
import {SidebarActionsGroup, SidebarMiniHeader} from '@stagistic/ui';
import {
    Fragment,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {ATTRIBUTE_MANAGER_PANEL_STRUCTURE} from '../../attributes/attributeManagerMenu';
import {useScriptSession} from '../../ScriptSessionContext';
import {AttributeManagerSidebarButton} from '../sidebar/AttributeManagerSidebarButton';
import styles from './ScriptStructureSidebar.module.css';
import {
    buildAccessibilityPlugin,
    configuredKeyboardSensor,
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
import {StructureSidebarContextActions} from './StructureSidebarContextActions';
import {useStructureSidebarDnd} from './useStructureSidebarDnd';

const ACTIVE_BLOCK_PERSIST_DELAY_MS = 250;

interface ScriptStructureSidebarProps {
    header?: ReactNode,
}

export const ScriptStructureSidebar = ({header}: ScriptStructureSidebarProps) => {
    const {
        currentScriptId, indexSnapshot,
    } = useScriptSession();
    const {setActiveBlock} = useScriptActions();
    const actCommands = useEditorActCommands();
    const liveStructure = useEditorLiveStructure();
    const scenePlacement = useEditorLiveScenePlacement();
    const liveActiveBlockId = useEditorLiveActiveBlock();
    const focusBlock = useFocusEditorBlock();

    // ── Local state ──────────────────────────────────────────────────────────
    const [actNamePreviewById, setActNamePreviewById] = useState<Record<string, string>>({});

    // ── Active block persistence (debounced) ─────────────────────────────────
    const lastPersistedActiveBlockIdsRef = useRef(new Map<string, string | null>());
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

        if (!scriptId || lastPersistedActiveBlockIdsRef.current.get(scriptId) === blockId) {
            return;
        }

        void setActiveBlock(scriptId, blockId).then(() => {
            lastPersistedActiveBlockIdsRef.current.set(scriptId, blockId);
        }).catch(() => undefined);
    }, [clearPendingPersistTimer, setActiveBlock]);

    // Flush on unmount
    useEffect(() => () => {
        flushPendingActiveBlockPersist();
    }, [flushPendingActiveBlockPersist]);

    // Reset + flush on script change
    useEffect(() => {
        flushPendingActiveBlockPersist();
        setActNamePreviewById({});
    }, [currentScriptId, flushPendingActiveBlockPersist]);

    // Debounced persist on active block change
    useEffect(() => {
        if (
            !currentScriptId
            || lastPersistedActiveBlockIdsRef.current.get(currentScriptId) === liveActiveBlockId
        ) {
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
        actCommands.renameAct(blockId, nextName.trim());
    }, [actCommands]);

    const handleActNamePreview = useCallback((blockId: string, nextName: string) => {
        // Store the draft verbatim — trimming here would eat spaces mid-typing.
        setActNamePreviewById(prev => ({...prev, [blockId]: nextName}));
    }, []);

    const handleActNamePreviewClear = useCallback((blockId: string) => {
        setActNamePreviewById(prev => {
            if (!(blockId in prev)) {
                return prev;
            }

            const next = {...prev};

            delete next[blockId];

            return next;
        });
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
        (defaults: readonly unknown[]) => [
            ...defaults.filter(sensor => sensor !== PointerSensor && sensor !== KeyboardSensor),
            configuredPointerSensor,
            configuredKeyboardSensor,
        ],
        [],
    );

    const hasContent = groups.some(g => g.groupId !== ROOT_ACT_GROUP || g.scenes.length > 0);

    return (
        <div className={styles.content}>
            <SidebarMiniHeader
                navigation={header}
                actions={<StructureSidebarContextActions />}
                controls={(
                    <SidebarActionsGroup>
                        <AttributeManagerSidebarButton panelId={ATTRIBUTE_MANAGER_PANEL_STRUCTURE} />
                    </SidebarActionsGroup>
                )}
            />
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
                                                onNamePreviewClear={handleActNamePreviewClear}
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
                                                onNamePreviewClear={handleActNamePreviewClear}
                                                onDelete={handleDeleteAct}
                                            />
                                        )
                                    )}
                                    {group.scenes.map((scene, idx) => {
                                        const placement = scenePlacement.byBlockId.get(scene.blockId);

                                        return (
                                            <StructureRowScene
                                                key={scene.blockId}
                                                blockId={scene.blockId}
                                                title={scene.title}
                                                sceneNumber={scene.sceneNumber}
                                                index={idx + sceneIndexOffset}
                                                groupId={group.groupId}
                                                isActive={scene.blockId === activeSceneBlockId}
                                                startPage={placement?.startPage}
                                                onFocus={handleSceneFocus}
                                            />
                                        );
                                    })}
                                </Fragment>
                            );
                        })}
                    </ul>
                )}
            </DragDropProvider>
        </div>
    );
};

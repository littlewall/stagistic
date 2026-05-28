import {
    Accessibility,
    Feedback,
    PointerSensor,
} from '@dnd-kit/dom';
import {DragDropProvider} from '@dnd-kit/react';
import {
    useEditorLiveActiveBlock,
    useEditorLiveStructure,
    useFocusEditorBlock,
} from '@stagistic/editor';
import {
    Fragment,
    useCallback,
    useMemo,
} from 'react';

import styles from './ScriptStructureSidebar.module.css';
import {
    buildAccessibilityPlugin,
    configuredPointerSensor,
    feedbackWithoutDropAnimation,
} from './structureDndConfig';
import {StructureRowAct} from './StructureRowAct';
import {
    deriveStructureStateFromIndex,
    deriveStructureStateFromLive,
    resolveActiveSceneBlockId,
    ROOT_ACT_GROUP,
    type SceneItem,
} from './structureRows';
import {StructureRowScene} from './StructureRowScene';
import type {ScriptStructureSidebarProps} from './types';
import {useStructureSidebarDnd} from './useStructureSidebarDnd';

export const ScriptStructureSidebar = ({data, actions}: ScriptStructureSidebarProps) => {
    const {indexSnapshot, actNamePreviewById} = data;
    const liveStructure = useEditorLiveStructure();
    const liveActiveBlockId = useEditorLiveActiveBlock();
    const focusBlock = useFocusEditorBlock();

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

    const handleDragEnd = useStructureSidebarDnd({
        groups,
        onReorderScene: actions.onReorderScene,
    });

    const handleSceneFocus = useCallback((id: string) => focusBlock(id), [focusBlock]);

    // Map every scene block id → scene row (for accessibility announcements).
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
                        {groups.map(group => (
                            <Fragment key={group.groupId}>
                                {group.groupId !== ROOT_ACT_GROUP ? (
                                    <StructureRowAct
                                        blockId={group.groupId}
                                        name={group.actName ?? ''}
                                        isFirstAct={group.groupId === firstActBlockId}
                                        namePreview={actNamePreviewById[group.groupId]}
                                        onRename={actions.onRenameAct}
                                        onNamePreview={actions.onActNamePreview}
                                        onDelete={actions.onDeleteAct}
                                    />
                                ) : null}
                                {group.scenes.map((scene, idx) => (
                                    <StructureRowScene
                                        key={scene.blockId}
                                        blockId={scene.blockId}
                                        title={scene.title}
                                        index={idx}
                                        groupId={group.groupId}
                                        isActive={scene.blockId === activeSceneBlockId}
                                        onFocus={handleSceneFocus}
                                    />
                                ))}
                            </Fragment>
                        ))}
                    </ul>
                )}
            </DragDropProvider>
        </div>
    );
};

import {DragDropProvider} from '@dnd-kit/react';
import {
    useEditorLiveActiveBlock,
    useEditorLiveStructure,
} from '@stagistic/editor-ui';
import {useMemo} from 'react';

import styles from './ScriptStructureSidebar.module.css';
import {StructureRowAct} from './StructureRowAct';
import {
    deriveStructureRowsBase,
    deriveStructureRowsBaseFromIndex,
    resolveActiveSceneBlockId,
    type StructureRow,
} from './structureRows';
import {StructureRowScene} from './StructureRowScene';
import {StructureSidebarHeader} from './StructureSidebarHeader';
import type {ScriptStructureSidebarProps} from './types';
import {useStructureSidebarDnd} from './useStructureSidebarDnd';

const liveRowByBlockIdCache = new WeakMap<readonly StructureRow[], ReadonlyMap<string, StructureRow>>();

const getLiveRowByBlockId = (rows: readonly StructureRow[]) => {
    const cached = liveRowByBlockIdCache.get(rows);

    if (cached) {
        return cached;
    }

    const map = new Map(rows.map(row => [row.blockId, row] as const));

    liveRowByBlockIdCache.set(rows, map);

    return map;
};

export const ScriptStructureSidebar = ({
    data,
    actions,
}: ScriptStructureSidebarProps) => {
    const {
        value,
        indexSnapshot,
        structureSettings,
        actNamePreviewById,
        activeBlockId,
    } = data;
    const liveStructure = useEditorLiveStructure();
    const liveActiveBlockId = useEditorLiveActiveBlock();
    const {
        rows,
        rowByBlockId,
        rowIndexByBlockId,
        sceneByBlockId,
    } = useMemo(() => {
        if (liveStructure.rows.length > 0) {
            const rows = liveStructure.rows as readonly StructureRow[];

            return {
                rows,
                rowByBlockId: getLiveRowByBlockId(rows),
                rowIndexByBlockId: liveStructure.rowIndexByBlockId,
                sceneByBlockId: liveStructure.sceneByBlockId,
            };
        }

        if (indexSnapshot) {
            return deriveStructureRowsBaseFromIndex(indexSnapshot);
        }

        return deriveStructureRowsBase(value?.content);
    }, [
        indexSnapshot,
        liveStructure,
        value?.content,
    ]);
    const resolvedActiveBlockId = liveActiveBlockId ?? activeBlockId;
    const activeSceneBlockId = useMemo(() => {
        return resolveActiveSceneBlockId({
            rowByBlockId,
            sceneByBlockId,
        }, resolvedActiveBlockId);
    }, [
        resolvedActiveBlockId,
        rowByBlockId,
        sceneByBlockId,
    ]);
    const actRowData = useMemo(() => ({
        structureSettings,
        actNamePreviewById,
    }), [actNamePreviewById, structureSettings]);
    const actRowActions = useMemo(() => ({
        onFocusBlock: actions.onFocusBlock,
        onRenameAct: actions.onRenameAct,
        onActNamePreview: actions.onActNamePreview,
        onDeleteAct: actions.onDeleteAct,
    }), [
        actions.onActNamePreview,
        actions.onDeleteAct,
        actions.onFocusBlock,
        actions.onRenameAct,
    ]);
    const sceneRowActions = useMemo(() => ({
        onFocusBlock: actions.onFocusBlock,
    }), [actions.onFocusBlock]);
    const handleDragEnd = useStructureSidebarDnd({
        rows,
        rowByBlockId,
        rowIndexByBlockId,
        actions: {
            onFocusBlock: actions.onFocusBlock,
            onReorderAct: actions.onReorderAct,
            onReorderScene: actions.onReorderScene,
        },
    });

    return (
        <aside className={styles.sidebar}>
            <StructureSidebarHeader actions={{onInsertAct: actions.onInsertAct}} />
            <DragDropProvider onDragEnd={handleDragEnd}>
                {rows.length === 0 ? (
                    <p className={styles.empty}>
                        Structure outline will appear after adding Scene headings or ACT blocks.
                    </p>
                ) : null}
                {rows.length > 0 ? (
                    <ul className={styles.itemList}>
                        {rows.map(row => {
                            const rowIndex = rowIndexByBlockId.get(row.blockId) ?? row.index;

                            if (row.kind === 'act') {
                                return (
                                    <StructureRowAct
                                        key={`${row.kind}-${row.blockId}`}
                                        act={row}
                                        rowIndex={rowIndex}
                                        data={actRowData}
                                        actions={actRowActions}
                                    />
                                );
                            }

                            return (
                                <StructureRowScene
                                    key={`${row.kind}-${row.blockId}`}
                                    scene={row}
                                    rowIndex={rowIndex}
                                    isActive={row.blockId === activeSceneBlockId}
                                    actions={sceneRowActions}
                                />
                            );
                        })}
                    </ul>
                ) : null}
            </DragDropProvider>
        </aside>
    );
};

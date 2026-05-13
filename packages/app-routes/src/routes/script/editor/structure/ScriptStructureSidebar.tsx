import {DragDropProvider} from '@dnd-kit/react';
import {
    useEditorLiveActiveBlock,
    useEditorLiveStructure,
    useFocusEditorBlock,
} from '@stagistic/editor';
import {useMemo} from 'react';

import styles from './ScriptStructureSidebar.module.css';
import {StructureRowAct} from './StructureRowAct';
import {
    deriveStructureRowsBaseFromIndex,
    resolveActiveSceneBlockId,
    type StructureRow,
} from './structureRows';
import {StructureRowScene} from './StructureRowScene';
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
        indexSnapshot,
        structureSettings,
        actNamePreviewById,
    } = data;
    const liveStructure = useEditorLiveStructure();
    const liveActiveBlockId = useEditorLiveActiveBlock();
    // Direct editor API — no request/state/prop cascade needed
    const focusBlock = useFocusEditorBlock();
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

        return deriveStructureRowsBaseFromIndex(null);
    }, [indexSnapshot, liveStructure]);
    const resolvedActiveBlockId = liveActiveBlockId;
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
        onFocusBlock: focusBlock,
        onRenameAct: actions.onRenameAct,
        onActNamePreview: actions.onActNamePreview,
        onDeleteAct: actions.onDeleteAct,
    }), [
        actions.onActNamePreview,
        actions.onDeleteAct,
        actions.onRenameAct,
        focusBlock,
    ]);
    const sceneRowActions = useMemo(() => ({
        onFocusBlock: focusBlock,
    }), [focusBlock]);
    const handleDragEnd = useStructureSidebarDnd({
        rows,
        rowByBlockId,
        rowIndexByBlockId,
        actions: {
            onFocusBlock: focusBlock,
            onReorderScene: actions.onReorderScene,
        },
    });

    return (
        <div className={styles.content}>
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
        </div>
    );
};

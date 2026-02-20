import {DragDropProvider} from '@dnd-kit/react';
import {useMemo} from 'react';

import styles from './ScriptStructureSidebar.module.css';
import {StructureRowAct} from './StructureRowAct';
import {
    deriveStructureRowsBase,
    resolveActiveSceneBlockId,
} from './structureRows';
import {StructureRowScene} from './StructureRowScene';
import {StructureSidebarHeader} from './StructureSidebarHeader';
import type {ScriptStructureSidebarProps} from './types';
import {useStructureSidebarDnd} from './useStructureSidebarDnd';

export const ScriptStructureSidebar = ({
    data,
    actions,
}: ScriptStructureSidebarProps) => {
    const {
        value,
        structureSettings,
        actNamePreviewById,
        activeBlockId,
    } = data;
    const {
        rows,
        rowByBlockId,
        rowIndexByBlockId,
        sceneByBlockId,
    } = useMemo(() => {
        return deriveStructureRowsBase(value?.content);
    }, [value?.content]);
    const activeSceneBlockId = useMemo(() => {
        return resolveActiveSceneBlockId({
            rowByBlockId,
            sceneByBlockId,
        }, activeBlockId);
    }, [
        activeBlockId,
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

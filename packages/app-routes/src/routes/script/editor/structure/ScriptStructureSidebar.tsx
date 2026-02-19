import {DragDropProvider} from '@dnd-kit/react';
import {type ScriptDocument, type StructureSettings} from '@stagistic/script-core';
import {useMemo} from 'react';

import styles from './ScriptStructureSidebar.module.css';
import {StructureRowAct} from './StructureRowAct';
import {
    deriveStructureRows,
    type StructureRow,
} from './structureRows';
import {StructureRowScene} from './StructureRowScene';
import {StructureSidebarHeader} from './StructureSidebarHeader';
import {useStructureSidebarDnd} from './useStructureSidebarDnd';

type ScriptStructureSidebarProps = {
    value: ScriptDocument | null | undefined,
    structureSettings: StructureSettings,
    actNamePreviewById: Record<string, string>,
    activeBlockId: string | null,
    onFocusBlock: (blockId: string) => void,
    onRenameAct: (blockId: string, nextName: string) => void,
    onActNamePreview: (blockId: string, nextName: string) => void,
    onDeleteAct: (blockId: string) => void,
    onInsertAct: () => void,
    onReorderAct: (sourceActBlockId: string, beforeBlockId: string | null) => void,
    onReorderScene: (sourceSceneBlockId: string, beforeBlockId: string | null) => void,
};

const renderRow = (
    row: StructureRow,
    rowIndex: number,
    args: {
        structureSettings: StructureSettings,
        actNamePreviewById: Record<string, string>,
        activeSceneBlockId: string | null,
        onFocusBlock: (blockId: string) => void,
        onRenameAct: (blockId: string, nextName: string) => void,
        onActNamePreview: (blockId: string, nextName: string) => void,
        onDeleteAct: (blockId: string) => void,
    },
) => {
    if (row.kind === 'act') {
        return (
            <StructureRowAct
                key={`${row.kind}-${row.blockId}`}
                act={row}
                rowIndex={rowIndex}
                structureSettings={args.structureSettings}
                actNamePreviewById={args.actNamePreviewById}
                onFocusBlock={args.onFocusBlock}
                onRenameAct={args.onRenameAct}
                onActNamePreview={args.onActNamePreview}
                onDeleteAct={args.onDeleteAct}
            />
        );
    }

    return (
        <StructureRowScene
            key={`${row.kind}-${row.blockId}`}
            scene={row}
            rowIndex={rowIndex}
            isActive={row.blockId === args.activeSceneBlockId}
            onFocusBlock={args.onFocusBlock}
        />
    );
};

export const ScriptStructureSidebar = ({
    value,
    structureSettings,
    actNamePreviewById,
    activeBlockId,
    onFocusBlock,
    onRenameAct,
    onActNamePreview,
    onDeleteAct,
    onInsertAct,
    onReorderAct,
    onReorderScene,
}: ScriptStructureSidebarProps) => {
    const {
        rows,
        rowByBlockId,
        rowIndexByBlockId,
        activeSceneBlockId,
    } = useMemo(() => {
        return deriveStructureRows(value?.content, activeBlockId);
    }, [activeBlockId, value?.content]);
    const handleDragEnd = useStructureSidebarDnd({
        rows,
        rowByBlockId,
        rowIndexByBlockId,
        onReorderAct,
        onReorderScene,
    });

    return (
        <aside className={styles.sidebar}>
            <StructureSidebarHeader onInsertAct={onInsertAct} />
            <DragDropProvider onDragEnd={handleDragEnd}>
                {rows.length === 0 ? (
                    <p className={styles.empty}>
                        Structure outline will appear after adding Scene headings or ACT blocks.
                    </p>
                ) : null}
                {rows.length > 0 ? (
                    <ul className={styles.itemList}>
                        {rows.map(row => renderRow(row, rowIndexByBlockId.get(row.blockId) ?? row.index, {
                            structureSettings,
                            actNamePreviewById,
                            activeSceneBlockId,
                            onFocusBlock,
                            onRenameAct,
                            onActNamePreview,
                            onDeleteAct,
                        }))}
                    </ul>
                ) : null}
            </DragDropProvider>
        </aside>
    );
};

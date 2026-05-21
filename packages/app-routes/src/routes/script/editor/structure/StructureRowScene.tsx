import {useSortable} from '@dnd-kit/react/sortable';
import {memo} from 'react';

import {
    ACT_DND_TYPE, SCENE_DND_TYPE, STRUCTURE_SORT_GROUP,
} from './dnd';
import styles from './ScriptStructureSidebar.module.css';
import type {StructureRowSceneProps} from './types';

const joinClassNames = (...classNames: Array<string | false | null | undefined>) => {
    return classNames.filter(Boolean).join(' ');
};

export const StructureRowScene = memo(({
    scene,
    rowIndex,
    isActive,
    actions,
}: StructureRowSceneProps) => {
    const {
        ref,
        handleRef,
        isDropTarget,
        isDragging,
    } = useSortable({
        id: scene.blockId,
        index: rowIndex,
        group: STRUCTURE_SORT_GROUP,
        type: SCENE_DND_TYPE,
        accept: [ACT_DND_TYPE, SCENE_DND_TYPE],
        feedback: 'default',
    });
    const sceneRowClassName = joinClassNames(
        styles.itemRow,
        styles.sceneRow,
        isActive ? styles.active : null,
        isDropTarget ? styles.dropTarget : null,
        isDragging ? styles.dragging : null,
    );

    return (
        <li>
            <div className={sceneRowClassName} ref={ref}>
                <button
                    type="button"
                    ref={handleRef}
                    className={styles.dragHandle}
                    aria-label="Drag scene"
                />
                <button
                    type="button"
                    className={styles.itemButton}
                    onMouseDown={event => {
                        event.preventDefault();
                    }}
                    onClick={() => {
                        actions.onFocusBlock(scene.blockId);
                    }}
                >
                    <span className={styles.itemLabel}>{scene.title}</span>
                </button>
            </div>
        </li>
    );
});

StructureRowScene.displayName = 'StructureRowScene';

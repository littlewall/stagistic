import {useSortable} from '@dnd-kit/react/sortable';
import {memo} from 'react';

import {SCENE_DND_TYPE} from './dnd';
import styles from './ScriptStructureSidebar.module.css';
import type {StructureRowSceneProps} from './types';

export const StructureRowScene = memo(({
    blockId,
    title,
    index,
    groupId,
    isActive,
    onFocus,
}: StructureRowSceneProps) => {
    const {ref, handleRef} = useSortable({
        id: blockId,
        index,
        group: groupId,
        type: SCENE_DND_TYPE,
        accept: [SCENE_DND_TYPE],
        feedback: 'clone',
    });

    return (
        <li
            ref={ref}
            className={`${styles.itemRow} ${styles.sceneRow}${isActive ? ` ${styles.active}` : ''}`}
        >
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
                    onFocus(blockId);
                }}
            >
                <span className={`${styles.itemLabel} ${styles.sceneTitle}`}>{title}</span>
            </button>
        </li>
    );
});

StructureRowScene.displayName = 'StructureRowScene';

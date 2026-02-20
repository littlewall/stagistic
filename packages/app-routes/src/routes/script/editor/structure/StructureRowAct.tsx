import {useSortable} from '@dnd-kit/react/sortable';
import {normalizeActName} from '@stagistic/script-core';
import {
    memo,
    useCallback,
} from 'react';

import {
    ACT_DND_TYPE, SCENE_DND_TYPE, STRUCTURE_SORT_GROUP,
} from './dnd';
import styles from './ScriptStructureSidebar.module.css';
import type {StructureRowActProps} from './types';

const joinClassNames = (...classNames: Array<string | false | null | undefined>) => {
    return classNames.filter(Boolean).join(' ');
};

export const StructureRowAct = memo(({
    act,
    rowIndex,
    data,
    actions,
}: StructureRowActProps) => {
    const {structureSettings, actNamePreviewById} = data;
    const {
        onFocusBlock,
        onRenameAct,
        onActNamePreview,
        onDeleteAct,
    } = actions;
    const {
        ref,
        handleRef,
        isDropTarget,
        isDragging,
    } = useSortable({
        id: act.blockId,
        index: rowIndex,
        group: STRUCTURE_SORT_GROUP,
        type: ACT_DND_TYPE,
        accept: [ACT_DND_TYPE, SCENE_DND_TYPE],
        feedback: 'default',
    });
    const actRowClassName = joinClassNames(
        styles.itemRow,
        styles.actRow,
        isDropTarget ? styles.itemRowDropTarget : null,
        isDragging ? styles.itemButtonDragging : null,
    );

    const handleActNameChange = useCallback((value: string, currentName: string) => {
        const normalizedValue = normalizeActName(value);
        const trimmedValue = normalizedValue.trim();
        const normalizedCurrentName = normalizeActName(currentName).trim();

        onActNamePreview(act.blockId, normalizedValue);

        if (trimmedValue === normalizedCurrentName) {
            return;
        }

        onRenameAct(act.blockId, trimmedValue);
    }, [
        act.blockId,
        onActNamePreview,
        onRenameAct,
    ]);

    const handleActNameBlur = useCallback((currentName: string) => {
        const normalizedCurrentName = normalizeActName(currentName).trim();
        const draftValue = (actNamePreviewById[act.blockId] ?? normalizedCurrentName).trim();

        onActNamePreview(act.blockId, draftValue);

        if (draftValue === normalizedCurrentName) {
            return;
        }

        onRenameAct(act.blockId, draftValue);
    }, [
        act.blockId,
        actNamePreviewById,
        onActNamePreview,
        onRenameAct,
    ]);

    return (
        <li>
            <div
                className={actRowClassName}
                ref={ref}
                data-structure-act-id={act.blockId}
            >
                <button
                    type="button"
                    ref={handleRef}
                    className={styles.dragHandle}
                    aria-label="Drag ACT"
                />
                <div className={styles.actTitle}>
                    {structureSettings.actPrefix.trim() ? (
                        <button
                            type="button"
                            className={styles.actPrefixButton}
                            onMouseDown={event => {
                                event.preventDefault();
                                onFocusBlock(act.blockId);
                            }}
                        >
                            {`${structureSettings.actPrefix.trim()} `}
                        </button>
                    ) : null}
                    <input
                        type="text"
                        className={styles.actTitleInput}
                        value={normalizeActName(actNamePreviewById[act.blockId] ?? act.name)}
                        aria-label={`Rename ${structureSettings.actPrefix.trim()} ${act.name}`}
                        onChange={event => {
                            handleActNameChange(event.target.value, act.name);
                        }}
                        onBlur={() => {
                            handleActNameBlur(act.name);
                        }}
                        onMouseDown={event => {
                            event.stopPropagation();
                        }}
                        onKeyDown={event => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                handleActNameBlur(act.name);
                                event.currentTarget.blur();
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault();
                                onActNamePreview(act.blockId, normalizeActName(act.name));
                                event.currentTarget.blur();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={styles.actDeleteButton}
                        aria-label={`Delete ${structureSettings.actPrefix.trim()} ${act.name}`}
                        onMouseDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDeleteAct(act.blockId);
                        }}
                    >
                        ×
                    </button>
                </div>
            </div>
        </li>
    );
});

StructureRowAct.displayName = 'StructureRowAct';

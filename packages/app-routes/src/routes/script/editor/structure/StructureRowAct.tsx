import {useSortable} from '@dnd-kit/react/sortable';
import {ActBlockIcon, clsx} from '@stagistic/ui';
import {
    memo, useCallback,
} from 'react';

import {ACT_DND_TYPE, SCENE_DND_TYPE} from './dnd';
import styles from './ScriptStructureSidebar.module.css';
import type {StructureRowActContentProps, StructureRowActProps} from './types';

const ActRowContent = memo(({
    blockId,
    name,
    isFirstAct,
    namePreview,
    onRename,
    onNamePreview,
    onDelete,
}: StructureRowActContentProps) => {
    const handleNameChange = useCallback(
        (value: string) => {
            const trimmedValue = value.trim();
            const normalizedCurrentName = name.trim();

            onNamePreview(blockId, trimmedValue);

            if (trimmedValue === normalizedCurrentName) {
                return;
            }

            onRename(blockId, trimmedValue);
        },
        [
            blockId,
            name,
            onNamePreview,
            onRename,
        ],
    );

    const handleBlur = useCallback(() => {
        const normalizedCurrentName = name.trim();
        const draftValue = (namePreview ?? normalizedCurrentName).trim();

        onNamePreview(blockId, draftValue);

        if (draftValue === normalizedCurrentName) {
            return;
        }

        onRename(blockId, draftValue);
    }, [
        blockId,
        name,
        namePreview,
        onNamePreview,
        onRename,
    ]);

    return (
        <>
            <span className={styles.actIconWrapper} aria-hidden="true">
                <ActBlockIcon />
            </span>
            <div className={styles.actTitle}>
                <input
                    type="text"
                    className={clsx(styles.actTitleInput, styles.actTitleDisplay)}
                    value={namePreview ?? name}
                    aria-label={`Rename act ${name}`}
                    onChange={event => {
                        handleNameChange(event.target.value);
                    }}
                    onBlur={handleBlur}
                    onMouseDown={event => {
                        event.stopPropagation();
                    }}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            handleBlur();
                            event.currentTarget.blur();
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            onNamePreview(blockId, name);
                            event.currentTarget.blur();
                        }
                    }}
                />
                {!isFirstAct && (
                    <button
                        type="button"
                        className={styles.actDeleteButton}
                        aria-label={`Delete act ${name}`}
                        onMouseDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDelete(blockId);
                        }}
                    >
                        ×
                    </button>
                )}
            </div>
        </>
    );
});

ActRowContent.displayName = 'ActRowContent';

export const StructureRowActStatic = memo((props: StructureRowActContentProps) => {
    return (
        <li data-structure-act-id={props.blockId}>
            <div className={clsx(styles.itemRow, styles.actRow)}>
                <ActRowContent {...props} />
            </div>
        </li>
    );
});

StructureRowActStatic.displayName = 'StructureRowActStatic';

export const StructureRowAct = memo(({index, ...content}: StructureRowActProps) => {
    const {ref, isDropTarget} = useSortable({
        id: content.blockId,
        index,
        group: content.blockId,
        type: ACT_DND_TYPE,
        accept: [SCENE_DND_TYPE],
        sensors: [],
    });

    return (
        <li ref={ref} data-structure-act-id={content.blockId}>
            <div className={clsx(styles.itemRow, styles.actRow, isDropTarget && styles.actDropTarget)}>
                <ActRowContent {...content} />
            </div>
        </li>
    );
});

StructureRowAct.displayName = 'StructureRowAct';

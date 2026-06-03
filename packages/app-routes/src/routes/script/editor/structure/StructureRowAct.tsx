import {normalizeActName} from '@stagistic/script';
import {ActBlockIcon, clsx} from '@stagistic/ui';
import {memo, useCallback} from 'react';

import styles from './ScriptStructureSidebar.module.css';
import type {StructureRowActProps} from './types';

export const StructureRowAct = memo(
    ({
        blockId,
        name,
        isFirstAct,
        namePreview,
        onRename,
        onNamePreview,
        onDelete,
    }: StructureRowActProps) => {
        const handleNameChange = useCallback(
            (value: string) => {
                const normalizedValue = normalizeActName(value);
                const trimmedValue = normalizedValue.trim();
                const normalizedCurrentName = normalizeActName(name).trim();

                onNamePreview(blockId, normalizedValue);

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
            const normalizedCurrentName = normalizeActName(name).trim();
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
            <li data-structure-act-id={blockId}>
                <div className={clsx(styles.itemRow, styles.actRow)}>
                    <span className={styles.actIconWrapper} aria-hidden="true">
                        <ActBlockIcon />
                    </span>
                    <div className={styles.actTitle}>
                        <input
                            type="text"
                            className={styles.actTitleInput}
                            value={normalizeActName(namePreview ?? name)}
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
                                    onNamePreview(blockId, normalizeActName(name));
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
                </div>
            </li>
        );
    },
);

StructureRowAct.displayName = 'StructureRowAct';

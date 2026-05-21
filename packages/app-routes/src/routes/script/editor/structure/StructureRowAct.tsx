import {normalizeActName} from '@stagistic/script';
import {ActBlockIcon} from '@stagistic/ui';
import {
    memo,
    useCallback,
} from 'react';

import styles from './ScriptStructureSidebar.module.css';
import type {StructureRowActProps} from './types';

export const StructureRowAct = memo(({
    act,
    isFirstAct,
    data,
    actions,
}: StructureRowActProps) => {
    const {actNamePreviewById} = data;
    const {
        onRenameAct,
        onActNamePreview,
        onDeleteAct,
    } = actions;

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
                className={`${styles.itemRow} ${styles.actRow}`}
                data-structure-act-id={act.blockId}
            >
                <span className={styles.actIconWrapper} aria-hidden="true">
                    <ActBlockIcon />
                </span>
                <div className={styles.actTitle}>
                    <input
                        type="text"
                        className={styles.actTitleInput}
                        value={normalizeActName(actNamePreviewById[act.blockId] ?? act.name)}
                        aria-label={`Rename act ${act.name}`}
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
                    {!isFirstAct ? (
                        <button
                            type="button"
                            className={styles.actDeleteButton}
                            aria-label={`Delete act ${act.name}`}
                            onMouseDown={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                onDeleteAct(act.blockId);
                            }}
                        >
                            ×
                        </button>
                    ) : null}
                </div>
            </div>
        </li>
    );
});

StructureRowAct.displayName = 'StructureRowAct';

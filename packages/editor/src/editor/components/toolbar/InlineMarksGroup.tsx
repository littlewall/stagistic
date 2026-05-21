import clsx from 'clsx';
import {
    Bold,
    Italic,
    Redo,
    Underline,
    Undo,
} from 'iconoir-react';

import styles from '../EditorToolbar.module.css';
import type {InlineMarksGroupProps} from './contracts';

export const InlineMarksGroup = ({
    state,
    actions,
}: InlineMarksGroupProps) => {
    const {
        canUndo,
        canRedo,
        isBoldActive,
        isItalicActive,
        isUnderlineActive,
    } = state;
    const {
        onUndoMouseDown,
        onRedoMouseDown,
        onBoldMouseDown,
        onItalicMouseDown,
        onUnderlineMouseDown,
    } = actions;

    return (
        <div className={styles.group}>
            <button
                className={styles.iconButton}
                type="button"
                aria-label="Undo"
                disabled={!canUndo}
                onMouseDown={onUndoMouseDown}
            >
                <Undo aria-hidden="true" />
            </button>
            <button
                className={styles.iconButton}
                type="button"
                aria-label="Redo"
                disabled={!canRedo}
                onMouseDown={onRedoMouseDown}
            >
                <Redo aria-hidden="true" />
            </button>
            <button
                className={clsx(styles.iconButton, isBoldActive && styles.active)}
                type="button"
                aria-label="Bold"
                aria-pressed={isBoldActive}
                onMouseDown={onBoldMouseDown}
            >
                <Bold aria-hidden="true" />
            </button>
            <button
                className={clsx(styles.iconButton, isItalicActive && styles.active)}
                type="button"
                aria-label="Italic"
                aria-pressed={isItalicActive}
                onMouseDown={onItalicMouseDown}
            >
                <Italic aria-hidden="true" />
            </button>
            <button
                className={clsx(styles.iconButton, isUnderlineActive && styles.active)}
                type="button"
                aria-label="Underline"
                aria-pressed={isUnderlineActive}
                onMouseDown={onUnderlineMouseDown}
            >
                <Underline aria-hidden="true" />
            </button>
        </div>
    );
};

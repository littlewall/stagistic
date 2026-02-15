import clsx from 'clsx';
import {
    Bold,
    Italic,
    Redo,
    Underline,
    Undo,
} from 'iconoir-react';
import {type MouseEvent as ReactMouseEvent} from 'react';

import styles from '../EditorToolbar.module.css';

type InlineMarksGroupProps = {
    canUndo: boolean,
    canRedo: boolean,
    isBoldActive: boolean,
    isItalicActive: boolean,
    isUnderlineActive: boolean,
    onUndoMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onRedoMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onBoldMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onItalicMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onUnderlineMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
};

export const InlineMarksGroup = ({
    canUndo,
    canRedo,
    isBoldActive,
    isItalicActive,
    isUnderlineActive,
    onUndoMouseDown,
    onRedoMouseDown,
    onBoldMouseDown,
    onItalicMouseDown,
    onUnderlineMouseDown,
}: InlineMarksGroupProps) => {
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
                className={clsx(styles.iconButton, isBoldActive && styles.iconButtonActive)}
                type="button"
                aria-label="Bold"
                aria-pressed={isBoldActive}
                onMouseDown={onBoldMouseDown}
            >
                <Bold aria-hidden="true" />
            </button>
            <button
                className={clsx(styles.iconButton, isItalicActive && styles.iconButtonActive)}
                type="button"
                aria-label="Italic"
                aria-pressed={isItalicActive}
                onMouseDown={onItalicMouseDown}
            >
                <Italic aria-hidden="true" />
            </button>
            <button
                className={clsx(styles.iconButton, isUnderlineActive && styles.iconButtonActive)}
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

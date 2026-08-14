import {
    BoldIcon, ItalicIcon, RedoIcon, Tooltip, UnderlineIcon, UndoIcon,
} from '@stagistic/ui';
import clsx from 'clsx';

import {getToolbarShortcutLabels} from '../../model/toolbarShortcutLabels';
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
    const shortcuts = getToolbarShortcutLabels();

    return (
        <div className={styles.group}>
            <Tooltip
                label="Undo"
                shortcut={shortcuts.undo}
                isDisabled={!canUndo}
            >
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Undo"
                    disabled={!canUndo}
                    onMouseDown={onUndoMouseDown}
                >
                    <UndoIcon aria-hidden="true" />
                </button>
            </Tooltip>
            <Tooltip
                label="Redo"
                shortcut={shortcuts.redo}
                isDisabled={!canRedo}
            >
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Redo"
                    disabled={!canRedo}
                    onMouseDown={onRedoMouseDown}
                >
                    <RedoIcon aria-hidden="true" />
                </button>
            </Tooltip>
            <Tooltip label="Bold" shortcut={shortcuts.bold}>
                <button
                    className={clsx(styles.iconButton, isBoldActive && styles.active)}
                    type="button"
                    aria-label="Bold"
                    aria-pressed={isBoldActive}
                    onMouseDown={onBoldMouseDown}
                >
                    <BoldIcon aria-hidden="true" />
                </button>
            </Tooltip>
            <Tooltip label="Italic" shortcut={shortcuts.italic}>
                <button
                    className={clsx(styles.iconButton, isItalicActive && styles.active)}
                    type="button"
                    aria-label="Italic"
                    aria-pressed={isItalicActive}
                    onMouseDown={onItalicMouseDown}
                >
                    <ItalicIcon aria-hidden="true" />
                </button>
            </Tooltip>
            <Tooltip label="Underline" shortcut={shortcuts.underline}>
                <button
                    className={clsx(styles.iconButton, isUnderlineActive && styles.active)}
                    type="button"
                    aria-label="Underline"
                    aria-pressed={isUnderlineActive}
                    onMouseDown={onUnderlineMouseDown}
                >
                    <UnderlineIcon aria-hidden="true" />
                </button>
            </Tooltip>
        </div>
    );
};

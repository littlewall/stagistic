import {
    BoldIcon,
    IconButton,
    ItalicIcon,
    RedoIcon,
    Tooltip,
    UnderlineIcon,
    UndoIcon,
} from '@stagistic/ui';

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
        <>
            <div className={styles.group}>
                <Tooltip
                    label="Undo"
                    shortcut={shortcuts.undo}
                    isDisabled={!canUndo}
                >
                    <IconButton
                        aria-label="Undo"
                        isDisabled={!canUndo}
                        onMouseDown={onUndoMouseDown}
                    >
                        <UndoIcon aria-hidden="true" />
                    </IconButton>
                </Tooltip>
                <Tooltip
                    label="Redo"
                    shortcut={shortcuts.redo}
                    isDisabled={!canRedo}
                >
                    <IconButton
                        aria-label="Redo"
                        isDisabled={!canRedo}
                        onMouseDown={onRedoMouseDown}
                    >
                        <RedoIcon aria-hidden="true" />
                    </IconButton>
                </Tooltip>
            </div>
            <span className={styles.divider} aria-hidden="true" />
            <div className={styles.group}>
                <Tooltip label="Bold" shortcut={shortcuts.bold}>
                    <IconButton
                        isSelected={isBoldActive}
                        aria-label="Bold"
                        aria-pressed={isBoldActive}
                        onMouseDown={onBoldMouseDown}
                    >
                        <BoldIcon aria-hidden="true" />
                    </IconButton>
                </Tooltip>
                <Tooltip label="Italic" shortcut={shortcuts.italic}>
                    <IconButton
                        isSelected={isItalicActive}
                        aria-label="Italic"
                        aria-pressed={isItalicActive}
                        onMouseDown={onItalicMouseDown}
                    >
                        <ItalicIcon aria-hidden="true" />
                    </IconButton>
                </Tooltip>
                <Tooltip label="Underline" shortcut={shortcuts.underline}>
                    <IconButton
                        isSelected={isUnderlineActive}
                        aria-label="Underline"
                        aria-pressed={isUnderlineActive}
                        onMouseDown={onUnderlineMouseDown}
                    >
                        <UnderlineIcon aria-hidden="true" />
                    </IconButton>
                </Tooltip>
            </div>
        </>
    );
};

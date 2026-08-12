import {Tooltip} from '@stagistic/ui';
import clsx from 'clsx';
import type {MouseEvent as ReactMouseEvent} from 'react';

import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import type {BlockNodeType} from '../../tiptap/scriptCore';
import styles from './EmptyEnterBlockChooserOverlay.module.css';

interface ChooserTypeButtonProps {
    optionType: BlockNodeType,
    label: string,
    shortcutLabel?: string,
    isActive: boolean,
    onMouseDown: (optionType: BlockNodeType, event: ReactMouseEvent<HTMLButtonElement>) => void,
}

export const ChooserTypeButton = ({
    optionType,
    label,
    shortcutLabel,
    isActive,
    onMouseDown,
}: ChooserTypeButtonProps) => {
    return (
        <Tooltip label={label}>
            <button
                type="button"
                className={clsx(styles.button, isActive && styles.active)}
                aria-label={`Set block type to ${label}`}
                onMouseDown={event => onMouseDown(optionType, event)}
            >
                <span className={styles.icon}>
                    {BLOCK_ICONS[optionType]}
                </span>
                {shortcutLabel && (
                    <span className={styles.shortcut}>{shortcutLabel}</span>
                )}
            </button>
        </Tooltip>
    );
};

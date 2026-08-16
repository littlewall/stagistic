import {Tooltip} from '@stagistic/ui';
import clsx from 'clsx';
import {type MouseEvent as ReactMouseEvent} from 'react';

import styles from '../../Editor.module.css';

interface EditorSidebarToggleButtonProps {
    side: 'left' | 'right',
    label: string,
    isOpen: boolean,
    className?: string,
    onMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
}

/**
 * The open state lives in the icon rather than in the button's chrome: the
 * sliver on the toggled side fills in. It reads at 16px, and it keeps the
 * toggle out of the two-accent system that means selection everywhere else.
 */
const PanelIcon = ({side, isOpen}: Pick<EditorSidebarToggleButtonProps, 'side' | 'isOpen'>) => (
    <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        focusable="false"
    >
        <rect
            x="2.5"
            y="3"
            width="15"
            height="14"
            rx="1.5"
        />
        <path d={side === 'left' ? 'M7 3v14' : 'M13 3v14'} />
        {isOpen ? (
            <rect
                x={side === 'left' ? 3.4 : 13.8}
                y="3.9"
                width="2.8"
                height="12.2"
                rx=".6"
                fill="currentColor"
                stroke="none"
            />
        ) : null}
    </svg>
);

export const EditorSidebarToggleButton = ({
    side,
    label,
    isOpen,
    className,
    onMouseDown,
}: EditorSidebarToggleButtonProps) => {
    const accessibleLabel = `${label} panel`;

    return (
        <Tooltip label={accessibleLabel} placement="bottom">
            <button
                className={clsx(styles.sidebarToggleButton, isOpen && styles.active, className)}
                type="button"
                aria-label={accessibleLabel}
                aria-pressed={isOpen}
                onMouseDown={onMouseDown}
            >
                <PanelIcon side={side} isOpen={isOpen} />
            </button>
        </Tooltip>
    );
};

import {Tooltip} from '@stagistic/ui';
import {type ReactNode} from 'react';

import styles from './SidebarContextButton.module.css';

interface SidebarContextButtonProps {
    ariaLabel: string,
    tooltipLabel?: string,
    onClick: () => void,
    children: ReactNode,
}

export const SidebarContextButton = ({
    ariaLabel,
    tooltipLabel,
    onClick,
    children,
}: SidebarContextButtonProps) => {
    const button = (
        <button
            type="button"
            className={styles.button}
            aria-label={ariaLabel}
            onMouseDown={event => {
                event.preventDefault();
                onClick();
            }}
        >
            {children}
        </button>
    );

    if (!tooltipLabel) {
        return button;
    }

    return (
        <Tooltip label={tooltipLabel} placement="bottom">
            {button}
        </Tooltip>
    );
};

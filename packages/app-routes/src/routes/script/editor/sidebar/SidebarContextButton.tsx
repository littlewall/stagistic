import {type ReactNode} from 'react';

import styles from './SidebarContextButton.module.css';

interface SidebarContextButtonProps {
    ariaLabel: string,
    onClick: () => void,
    children: ReactNode,
}

export const SidebarContextButton = ({
    ariaLabel,
    onClick,
    children,
}: SidebarContextButtonProps) => (
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

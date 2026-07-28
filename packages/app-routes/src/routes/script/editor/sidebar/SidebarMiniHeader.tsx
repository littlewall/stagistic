import {type ReactNode} from 'react';

import styles from './SidebarMiniHeader.module.css';

interface SidebarMiniHeaderProps {
    actions?: ReactNode,
    controls?: ReactNode,
}

export const SidebarMiniHeader = ({
    actions,
    controls,
}: SidebarMiniHeaderProps) => (
    <div className={styles.header}>
        <div className={styles.actions}>
            {actions}
        </div>
        <div className={styles.controls}>
            {controls}
        </div>
    </div>
);

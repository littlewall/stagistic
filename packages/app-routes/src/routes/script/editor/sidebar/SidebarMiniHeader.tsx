import {type ReactNode} from 'react';

import styles from './SidebarMiniHeader.module.css';

interface SidebarMiniHeaderProps {
    navigation?: ReactNode,
    actions?: ReactNode,
    controls?: ReactNode,
}

export const SidebarMiniHeader = ({
    navigation,
    actions,
    controls,
}: SidebarMiniHeaderProps) => (
    <div className={styles.header}>
        {navigation}
        <div className={styles.actions}>
            {actions}
        </div>
        <div className={styles.controls}>
            {controls}
        </div>
    </div>
);

import {type ReactNode} from 'react';

import styles from './SidebarMiniHeader.module.css';

interface SidebarActionsGroupProps {
    children: ReactNode,
}

export const SidebarActionsGroup = ({children}: SidebarActionsGroupProps) => (
    <div className={styles.actionsGroup}>{children}</div>
);

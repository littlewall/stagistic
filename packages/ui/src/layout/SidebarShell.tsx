import clsx from 'clsx';
import {type ReactElement, type ReactNode} from 'react';

import styles from './SidebarShell.module.css';

export type SidebarShellProps = {
    title?: ReactNode,
    actions?: ReactNode,
    className?: string,
    children?: ReactNode,
};

export const SidebarShell = ({
    title,
    actions,
    className,
    children,
}: SidebarShellProps): ReactElement => (
    <div className={clsx(styles.shell, className)}>
        <div className={styles.header}>
            {title != null && <div className={styles.title}>{title}</div>}
            {actions != null && <div className={styles.actions}>{actions}</div>}
        </div>
        <div className={styles.body}>{children}</div>
    </div>
);

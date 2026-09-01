import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './SettingsGroup.module.css';

export const SettingsGroup = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={clsx(styles.group, className)}>{children}</div>
);

export const SettingRow = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={clsx(styles.row, className)}>{children}</div>
);

export const PanelHeader = ({
    title,
    description,
    className,
}: {
    title: ReactNode,
    description?: ReactNode,
    className?: string,
}) => (
    <div className={clsx(styles.panelHeader, className)}>
        <h2 className={styles.panelTitle}>{title}</h2>
        {description ? <p className={styles.panelDescription}>{description}</p> : null}
    </div>
);

import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './SettingsGroup.module.css';

const GAP_CLASS = {
    md: styles.gapMd,
    lg: styles.gapLg,
    '2xl': styles.gap2xl,
} as const;

export type SettingsGroupGap = keyof typeof GAP_CLASS;

export const SettingsGroup = ({
    children,
    className,
    gap = 'md',
}: {
    children: ReactNode,
    className?: string,
    gap?: SettingsGroupGap,
}) => (
    <div className={clsx(styles.group, GAP_CLASS[gap], className)}>{children}</div>
);

export const SettingRow = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={clsx(styles.row, className)}>{children}</div>
);

export const PanelHeader = ({
    title,
    description,
    className,
    level = 2,
}: {
    title: ReactNode,
    description?: ReactNode,
    className?: string,
    level?: 2 | 3 | 4,
}) => {
    /*
     * The tag and the type size are independent: settings panels sit under the route's own
     * heading, so they need h3 semantics without an h3's smaller default size.
     */
    const Heading = `h${level}` as const;

    return (
        <div className={clsx(styles.panelHeader, className)}>
            <Heading className={styles.panelTitle}>{title}</Heading>
            {description ? <p className={styles.panelDescription}>{description}</p> : null}
        </div>
    );
};

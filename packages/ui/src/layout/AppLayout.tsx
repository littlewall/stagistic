import clsx from 'clsx';
import type {ReactNode} from 'react';

import {AppFooter} from './AppFooter';
import styles from './AppLayout.module.css';

type AppLayoutProps = {
    header?: ReactNode,
    sidebar?: ReactNode,
    /** Overrides the default footer. Pass `null` to render no footer at all. */
    footer?: ReactNode,
    children: ReactNode,
};

export const AppLayout = ({
    header,
    sidebar,
    footer,
    children,
}: AppLayoutProps) => {
    return (
        <div className={styles.page}>
            {header ? (
                <div className={styles.header}>{header}</div>
            ) : null}
            <div className={clsx(styles.body, sidebar ? null : styles.single)}>
                <main className={styles.main}>{children}</main>
                {sidebar ? (
                    <aside className={clsx(styles.sidebar)}>{sidebar}</aside>
                ) : null}
            </div>
            {footer === undefined ? <AppFooter /> : footer}
        </div>
    );
};

import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './AppLayout.module.css';

type AppLayoutProps = {
    header?: ReactNode,
    sidebar?: ReactNode,
    children: ReactNode,
};

export const AppLayout = ({
    header,
    sidebar,
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
        </div>
    );
};

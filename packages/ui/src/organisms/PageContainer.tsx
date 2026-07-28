import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './PageContainer.module.css';

type PageContainerProps = {
    children: ReactNode,
    variant?: 'standard' | 'compact',
    className?: string,
};

export const PageContainer = ({
    children,
    variant = 'standard',
    className,
}: PageContainerProps) => {
    return (
        <div className={styles.root}>
            <div
                className={clsx(
                    styles.inner,
                    styles[variant],
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
};

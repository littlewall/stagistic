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
        <div
            className={clsx(
                styles.root,
                styles[variant],
                className,
            )}
        >
            {children}
        </div>
    );
};

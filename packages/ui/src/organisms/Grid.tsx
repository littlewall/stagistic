import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './Grid.module.css';

type GridProps = {
    children: ReactNode,
    columns?: 1 | 2,
    className?: string,
};

export const Grid = ({
    children,
    columns = 2,
    className,
}: GridProps) => {
    return (
        <div
            className={clsx(
                styles.grid,
                {
                    [styles.cols2]: columns === 2,
                },
                className,
            )}
        >
            {children}
        </div>
    );
};

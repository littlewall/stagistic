import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './Tag.module.css';

type TagProps = {
    children: ReactNode,
    className?: string,
};

export const Tag = ({children, className}: TagProps) => (
    <span className={clsx(styles.tag, className)}>
        {children}
    </span>
);

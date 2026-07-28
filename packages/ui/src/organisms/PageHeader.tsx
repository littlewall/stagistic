import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './PageHeader.module.css';

type PageHeaderProps = {
    children: ReactNode,
    className?: string,
};

export const PageHeader = ({children, className}: PageHeaderProps) => (
    <section className={clsx(styles.root, className)}>
        {children}
    </section>
);

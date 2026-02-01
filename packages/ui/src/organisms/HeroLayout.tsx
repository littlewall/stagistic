import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './HeroLayout.module.css';

type HeroLayoutProps = {
    children: ReactNode,
    className?: string,
};

export const HeroLayout = ({children, className}: HeroLayoutProps) => (
    <div className={clsx(styles.root, className)}>
        {children}
    </div>
);

import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './ButtonGroup.module.css';

type ButtonGroupProps = {
    children: ReactNode,
    className?: string,
};

export const ButtonGroup = ({children, className}: ButtonGroupProps) => (
    <div className={clsx(styles.group, className)}>
        {children}
    </div>
);

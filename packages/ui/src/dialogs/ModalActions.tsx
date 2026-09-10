import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './modalChrome.module.css';

export interface ModalActionsProps {
    children: ReactNode,
    spacing?: 'lg' | 'none',
}

export const ModalActions = ({
    children,
    spacing = 'none',
}: ModalActionsProps) => (
    <div className={clsx(styles.actions, spacing === 'lg' && styles.actionsSpaced)}>
        {children}
    </div>
);

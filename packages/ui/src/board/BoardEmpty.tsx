import type {ReactNode} from 'react';

import {Notice} from '../feedback/Notice/Notice';
import styles from './BoardEmpty.module.css';

export interface BoardEmptyProps {
    children: ReactNode,
    /** The next useful step, e.g. a button into the Editor. */
    action?: ReactNode,
}

/** Quiet empty Board: one sentence and the way forward, nothing else. */
export const BoardEmpty = ({children, action}: BoardEmptyProps) => (
    <div className={styles.empty}>
        <Notice variant="empty">{children}</Notice>
        {action}
    </div>
);

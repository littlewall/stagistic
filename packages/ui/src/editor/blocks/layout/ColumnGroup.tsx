import type {PlateElementProps} from 'platejs/react';
import {PlateElement} from 'platejs/react';

import styles from './ColumnGroup.module.css';

export const ColumnGroup = ({children, ...props}: PlateElementProps) => (
    <PlateElement {...props} className={styles.columnGroup}>
        {children}
    </PlateElement>
);

export const ColumnItem = ({children, ...props}: PlateElementProps) => (
    <PlateElement {...props} className={styles.columnItem}>
        {children}
    </PlateElement>
);

import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
    type ReactNode,
} from 'react';

import styles from './ListRow.module.css';

type ListRowSize = 'compact' | 'library';

export type ListRowProps<T extends ElementType = 'div'> = {
    as?: T,
    size?: ListRowSize,
    selected?: boolean,
    /** Set false when the row's selected state is already announced by a child (e.g. aria-current). */
    announceSelected?: boolean,
    interactive?: boolean,
    leading?: ReactNode,
    trailing?: ReactNode,
    className?: string,
    children?: ReactNode,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

const SIZE_CLASS: Record<ListRowSize, string> = {
    compact: styles.compact,
    library: styles.library,
};

export const ListRow = <T extends ElementType = 'div'>({
    as,
    size = 'compact',
    selected = false,
    announceSelected = true,
    interactive = false,
    leading,
    trailing,
    className,
    children,
    ...props
}: ListRowProps<T>): ReactElement => createElement(
    as ?? 'div',
    {
        ...props,
        'aria-selected': (selected && announceSelected) || undefined,
        className: clsx(
            styles.row,
            SIZE_CLASS[size],
            {
                [styles.selected]: selected,
                [styles.interactive]: interactive,
            },
            className,
        ),
    },
    leading != null && <span key="leading" className={styles.leading}>{leading}</span>,
    <span key="main" className={styles.main}>{children}</span>,
    trailing != null && <span key="trailing" className={styles.trailing}>{trailing}</span>,
);

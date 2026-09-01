import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
    type ReactNode,
} from 'react';

import styles from './ListPanel.module.css';

export type ListPanelProps<T extends ElementType = 'div'> = {
    as?: T,
    bordered?: boolean,
    inset?: boolean,
    className?: string,
    children?: ReactNode,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export const ListPanel = <T extends ElementType = 'div'>({
    as,
    bordered = true,
    inset = false,
    className,
    children,
    ...props
}: ListPanelProps<T>): ReactElement => createElement(
    as ?? 'div',
    {
        ...props,
        className: clsx(
            styles.panel,
            {
                [styles.bordered]: bordered,
                [styles.inset]: inset,
            },
            className,
        ),
    },
    children,
);

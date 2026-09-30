import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Stack.module.css';

type StackGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

type StackJustify = 'start' | 'center' | 'end' | 'between';

export type StackProps<T extends ElementType = 'div'> = {
    as?: T,
    direction?: 'row' | 'column',
    gap?: StackGap,
    align?: StackAlign,
    justify?: StackJustify,
    wrap?: boolean,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'wrap'>;

const GAP_CLASS: Record<StackGap, string> = {
    none: styles.gapNone,
    xs: styles.gapXs,
    sm: styles.gapSm,
    md: styles.gapMd,
    lg: styles.gapLg,
    xl: styles.gapXl,
    '2xl': styles.gap2xl,
};

const ALIGN_CLASS: Record<StackAlign, string> = {
    start: styles.alignStart,
    center: styles.alignCenter,
    end: styles.alignEnd,
    stretch: styles.alignStretch,
    baseline: styles.alignBaseline,
};

const JUSTIFY_CLASS: Record<StackJustify, string> = {
    start: styles.justifyStart,
    center: styles.justifyCenter,
    end: styles.justifyEnd,
    between: styles.justifyBetween,
};

export const Stack = <T extends ElementType = 'div'>({
    as,
    direction = 'column',
    gap = 'md',
    align,
    justify,
    wrap = false,
    className,
    ...props
}: StackProps<T>): ReactElement => {
    const Element = as ?? 'div';

    return createElement(Element, {
        ...props,
        className: clsx(
            styles.stack,
            direction === 'row' ? styles.row : styles.column,
            GAP_CLASS[gap],
            align && ALIGN_CLASS[align],
            justify && JUSTIFY_CLASS[justify],
            wrap && styles.wrap,
            className,
        ),
    });
};

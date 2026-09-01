import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Skeleton.module.css';

type SkeletonShape = 'line' | 'block' | 'circle';

export type SkeletonProps<T extends ElementType = 'div'> = {
    as?: T,
    shape?: SkeletonShape,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const SHAPE_CLASS: Record<SkeletonShape, string> = {
    line: styles.line,
    block: styles.block,
    circle: styles.circle,
};

export const Skeleton = <T extends ElementType = 'div'>({
    as,
    shape = 'block',
    className,
    ...props
}: SkeletonProps<T>): ReactElement => createElement(as ?? 'div', {
    'aria-hidden': true,
    ...props,
    className: clsx(styles.skeleton, SHAPE_CLASS[shape], className),
});

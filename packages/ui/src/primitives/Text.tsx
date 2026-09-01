import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Text.module.css';

type TextVariant = 'body' | 'muted' | 'label' | 'mono' | 'eyebrow';

type TextSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export type TextProps<T extends ElementType = 'p'> = {
    as?: T,
    variant?: TextVariant,
    size?: TextSize,
    truncate?: boolean,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const VARIANT_CLASS: Record<TextVariant, string> = {
    body: styles.body,
    muted: styles.muted,
    label: styles.label,
    mono: styles.mono,
    eyebrow: styles.eyebrow,
};

const SIZE_CLASS: Record<TextSize, string> = {
    xxs: styles.sizeXxs,
    xs: styles.sizeXs,
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
    xl: styles.sizeXl,
    '2xl': styles.size2xl,
    '3xl': styles.size3xl,
    '4xl': styles.size4xl,
};

export const Text = <T extends ElementType = 'p'>({
    as,
    variant = 'body',
    size = 'md',
    truncate = false,
    className,
    ...props
}: TextProps<T>): ReactElement => {
    const Element = as ?? 'p';

    return createElement(Element, {
        ...props,
        className: clsx(
            styles.text,
            VARIANT_CLASS[variant],
            SIZE_CLASS[size],
            truncate && styles.truncate,
            className,
        ),
    });
};

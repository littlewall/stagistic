import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Overlay.module.css';

type OverlayPlacement = 'top' | 'bottom' | 'left' | 'right';

type OverlayElevation = 'popover' | 'panel' | 'canvas';

export type OverlayProps<T extends ElementType = 'div'> = {
    as?: T,
    placement?: OverlayPlacement,
    elevation?: OverlayElevation,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const PLACEMENT_CLASS: Record<OverlayPlacement, string> = {
    top: styles.top,
    bottom: styles.bottom,
    left: styles.left,
    right: styles.right,
};

const ELEVATION_CLASS: Record<OverlayElevation, string> = {
    popover: styles.popover,
    panel: styles.panel,
    canvas: styles.canvas,
};

export const Overlay = <T extends ElementType = 'div'>({
    as,
    placement = 'bottom',
    elevation = 'popover',
    className,
    ...props
}: OverlayProps<T>): ReactElement => createElement(as ?? 'div', {
    ...props,
    className: clsx(
        styles.overlay,
        PLACEMENT_CLASS[placement],
        ELEVATION_CLASS[elevation],
        className,
    ),
});

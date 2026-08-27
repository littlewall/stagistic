import clsx from 'clsx';
import type {ComponentPropsWithoutRef, ReactElement} from 'react';

import styles from './Overlay.module.css';

type OverlayPlacement = 'top' | 'bottom' | 'left' | 'right';

type OverlayElevation = 'popover' | 'panel' | 'canvas';

export type OverlayProps = {
    placement?: OverlayPlacement,
    elevation?: OverlayElevation,
    className?: string,
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>;

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

export const Overlay = ({
    placement = 'bottom',
    elevation = 'popover',
    className,
    ...props
}: OverlayProps): ReactElement => (
    <div
        {...props}
        className={clsx(
            styles.overlay,
            PLACEMENT_CLASS[placement],
            ELEVATION_CLASS[elevation],
            className,
        )}
    />
);

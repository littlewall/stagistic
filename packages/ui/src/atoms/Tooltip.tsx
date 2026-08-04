import type {
    ComponentProps,
    ReactElement,
    ReactNode,
} from 'react';
import {
    Focusable,
    Tooltip as AriaTooltip,
    type TooltipProps as AriaTooltipProps,
    TooltipTrigger,
} from 'react-aria-components';

import styles from './Tooltip.module.css';

type FocusableChild = ComponentProps<typeof Focusable>['children'];

export interface TooltipProps {
    /** Tooltip text shown on hover/focus. */
    label: ReactNode,
    /** Placement relative to the trigger. Defaults to 'top'. */
    placement?: AriaTooltipProps['placement'],
    /** Hover open delay in ms. Defaults to 0 (no delay). */
    delay?: number,
    /** Delay before closing after hover leaves the trigger. Defaults to 0 (no delay). */
    closeDelay?: number,
    /** Disable the tooltip (e.g. when the trigger button is disabled). */
    isDisabled?: boolean,
    /** A single focusable trigger element (e.g. a native <button>). */
    children: ReactElement,
}

/**
 * Reusable icon-button tooltip. Wraps any single focusable element (typically a
 * native <button>) so the same styling as the app header applies everywhere —
 * toolbars, bubble menus, gutter controls.
 */
export const Tooltip = ({
    label,
    placement = 'top',
    delay = 0,
    closeDelay = 0,
    isDisabled = false,
    children,
}: TooltipProps) => {
    if (isDisabled) {
        return children;
    }

    const trigger = typeof children.type === 'string'
        ? <Focusable>{children as FocusableChild}</Focusable>
        : children;

    return (
        <TooltipTrigger
            delay={delay}
            closeDelay={closeDelay}
        >
            {trigger}
            <AriaTooltip
                className={styles.tooltip}
                placement={placement}
                offset={6}
            >
                {label}
            </AriaTooltip>
        </TooltipTrigger>
    );
};

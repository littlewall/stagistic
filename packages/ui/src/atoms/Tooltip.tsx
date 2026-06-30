import type {ComponentProps, ReactElement, ReactNode} from 'react';
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
    /** Hover open delay in ms. Defaults to 600. */
    delay?: number,
    /** Disable the tooltip (e.g. when the trigger button is disabled). */
    isDisabled?: boolean,
    /** A single focusable trigger element (e.g. a native <button>). */
    children: ReactElement,
}

/**
 * Reusable icon-button tooltip. Wraps any single focusable element (typically a
 * native <button>) so the same styling as the app header applies everywhere —
 * toolbars, bubble menus, gutter controls. The trigger is made react-aria
 * compatible via <Focusable>, so plain DOM buttons work without conversion.
 */
export const Tooltip = ({
    label,
    placement = 'top',
    delay = 600,
    isDisabled = false,
    children,
}: TooltipProps) => (
    <TooltipTrigger delay={delay} isDisabled={isDisabled}>
        <Focusable isDisabled={isDisabled}>{children as FocusableChild}</Focusable>
        <AriaTooltip className={styles.tooltip} placement={placement} offset={6}>
            {label}
        </AriaTooltip>
    </TooltipTrigger>
);

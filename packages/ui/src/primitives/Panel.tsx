import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Panel.module.css';

type PanelLayer = 'shell' | 'panel' | 'float';

type PanelPadding = 'none' | 'sm' | 'md' | 'lg';

export type PanelProps<T extends ElementType = 'div'> = {
    as?: T,
    layer?: PanelLayer,
    padding?: PanelPadding,
    bordered?: boolean,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const LAYER_CLASS: Record<PanelLayer, string> = {
    shell: styles.layerShell,
    panel: styles.layerPanel,
    float: styles.layerFloat,
};

const PADDING_CLASS: Record<PanelPadding, string> = {
    none: styles.padNone,
    sm: styles.padSm,
    md: styles.padMd,
    lg: styles.padLg,
};

export const Panel = <T extends ElementType = 'div'>({
    as,
    layer = 'panel',
    padding = 'md',
    bordered = true,
    className,
    ...props
}: PanelProps<T>): ReactElement => {
    const Element = as ?? 'div';

    return createElement(Element, {
        ...props,
        className: clsx(
            styles.panel,
            LAYER_CLASS[layer],
            PADDING_CLASS[padding],
            bordered && styles.bordered,
            className,
        ),
    });
};

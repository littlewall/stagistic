import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Typography.module.css';

type TypographyProps<T extends ElementType> = {
    as?: T,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

type TypographyComponent<TDefault extends ElementType> = <
    TElement extends ElementType = TDefault,
>(
    props: TypographyProps<TElement>,
) => ReactElement | null;

const createTypography = <TDefault extends ElementType>(
    defaultElement: TDefault,
    baseClassName: string,
): TypographyComponent<TDefault> => {
    const Component = <TElement extends ElementType = TDefault>({
        as,
        className,
        ...props
    }: TypographyProps<TElement>) => {
        const Element = (as ?? defaultElement) as TElement;
        const elementProps = {
            ...props,
            className: clsx(baseClassName, className),
        } as ComponentPropsWithoutRef<TElement>;

        return createElement(Element, elementProps);
    };

    return Component;
};

export const Kicker = createTypography('p', styles.kicker);
export const PageTitle = createTypography('h1', styles.pageTitle);
export const SectionTitle = createTypography('h2', styles.sectionTitle);
export const SubtleText = createTypography('p', styles.subtle);

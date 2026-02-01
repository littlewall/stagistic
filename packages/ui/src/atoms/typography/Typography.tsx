import clsx from 'clsx';
import type {ComponentPropsWithoutRef, ElementType} from 'react';

import styles from './Typography.module.css';

type TypographyProps<T extends ElementType> = {
    as?: T,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const createTypography = <T extends ElementType>(
    defaultElement: T,
    baseClassName: string,
) => {
    const Component = <E extends ElementType = T>({
        as,
        className,
        ...props
    }: TypographyProps<E>) => {
        const Element = as ?? defaultElement;

        return (
            <Element
                {...props}
                className={clsx(baseClassName, className)}
            />
        );
    };

    return Component;
};

export const Kicker = createTypography('p', styles.kicker);
export const PageTitle = createTypography('h1', styles.pageTitle);
export const SectionTitle = createTypography('h2', styles.sectionTitle);
export const SubtleText = createTypography('p', styles.subtle);

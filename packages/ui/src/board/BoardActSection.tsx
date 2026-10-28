import {Children, type ReactNode} from 'react';

import {Text} from '../primitives/Text/Text';
import styles from './BoardActSection.module.css';

export interface BoardActSectionProps {
    title: string,
    titleContent?: ReactNode,
    /** Replaces the act heading, e.g. with an "Add act" control above scenes no act names yet. */
    heading?: ReactNode,
    actions?: ReactNode,
    /** Scene cards; each renders its own list item. */
    children?: ReactNode,
}

/** One act of the Board: an eyebrow heading over a wrapping grid of fixed-width scene cards. */
export const BoardActSection = ({
    title,
    titleContent,
    heading,
    actions,
    children,
}: BoardActSectionProps) => (
    <section className={styles.section} aria-label={title}>
        <div className={styles.heading}>
            {heading ?? (
                <Text
                    as="h2"
                    variant="eyebrow"
                    size="xs"
                >
                    {titleContent ?? title}
                </Text>
            )}
            {actions}
        </div>
        {Children.count(children) > 0 ? (
            <ul className={styles.grid}>{children}</ul>
        ) : (
            <Text variant="muted" size="sm">No scenes in this act.</Text>
        )}
    </section>
);

import {Children, type ReactNode} from 'react';

import {Text} from '../primitives/Text/Text';
import styles from './BoardActSection.module.css';

export interface BoardActSectionProps {
    title: string,
    /** Scene cards; each renders its own list item. */
    children?: ReactNode,
}

/** One act of the Board: an eyebrow heading over a wrapping grid of fixed-width scene cards. */
export const BoardActSection = ({title, children}: BoardActSectionProps) => (
    <section className={styles.section} aria-label={title}>
        <Text
            as="h2"
            variant="eyebrow"
            size="xs"
        >
            {title}
        </Text>
        {Children.count(children) > 0 ? (
            <ul className={styles.grid}>{children}</ul>
        ) : (
            <Text variant="muted" size="sm">No scenes in this act.</Text>
        )}
    </section>
);

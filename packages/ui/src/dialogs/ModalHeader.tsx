import type {ReactNode} from 'react';

import styles from './modalChrome.module.css';

export interface ModalHeaderProps {
    title: ReactNode,
    description?: ReactNode,
    notes?: ReactNode[],
}

/*
 * Renders a fragment on purpose. The heading and its paragraphs are direct flex children of the
 * ModalDialog panel and take its gap; wrapping them in an element would collapse that spacing.
 */
export const ModalHeader = ({
    title,
    description,
    notes,
}: ModalHeaderProps) => (
    <>
        <h2 className={styles.title}>{title}</h2>
        {description === undefined ? null : <p className={styles.description}>{description}</p>}
        {notes?.map((note, index) => (
            <p key={index} className={styles.note}>{note}</p>
        ))}
    </>
);

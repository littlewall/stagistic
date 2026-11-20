import type {ReactNode} from 'react';

import {IconButton} from '../../atoms/IconButton/IconButton';
import {CloseIcon} from '../../icons/ui/CloseIcon';
import {ChangeSummary, type ChangeSummaryItem} from '../../molecules/ChangeSummary/ChangeSummary';
import styles from './modalChrome.module.css';

export interface ModalHeaderProps {
    title: ReactNode,
    description?: ReactNode,
    /** What the action changes, as labelled outcomes after the description. */
    changes?: readonly ChangeSummaryItem[],
    notes?: ReactNode[],
    /** Adds a close × at the right of the title. */
    onClose?: () => void,
    /** Quiet detail at the right of the title, before the close ×. */
    aside?: ReactNode,
}

/*
 * Renders a fragment on purpose. The heading and its paragraphs are direct flex children of the
 * ModalDialog panel and take its gap; wrapping them in an element would collapse that spacing.
 */
export const ModalHeader = ({
    title,
    description,
    changes,
    notes,
    onClose,
    aside,
}: ModalHeaderProps) => (
    <>
        {onClose || aside !== undefined ? (
            <div className={styles.titleRow}>
                <h2 className={styles.title}>{title}</h2>
                {aside === undefined ? null : <div className={styles.titleAside}>{aside}</div>}
                {onClose ? (
                    <IconButton
                        aria-label="Close"
                        size="md"
                        onPress={onClose}
                    >
                        <CloseIcon aria-hidden="true" />
                    </IconButton>
                ) : null}
            </div>
        ) : <h2 className={styles.title}>{title}</h2>}
        {description === undefined ? null : <p className={styles.description}>{description}</p>}
        {changes && changes.length > 0 ? <ChangeSummary items={changes} className={styles.changes} /> : null}
        {notes?.map((note, index) => (
            <p
                key={index}
                className={styles.note}
            >
                {note}
            </p>
        ))}
    </>
);

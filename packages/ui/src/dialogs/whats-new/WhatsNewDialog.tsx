import clsx from 'clsx';
import {Link} from 'react-aria-components';

import {Button} from '../../atoms/Button/Button';
import buttonStyles from '../../atoms/Button/Button.module.css';
import {ModalDialog} from '../modal/ModalDialog';
import type {ModalFocusRestoreOptions} from '../modal/modalFocusTypes';
import {ModalHeader} from '../modal/ModalHeader';
import {ReleaseNoteItem} from './ReleaseNoteItem';
import styles from './WhatsNewDialog.module.css';

export type WhatsNewNoteType = 'feature' | 'improvement' | 'fix';

export interface WhatsNewNote {
    type: WhatsNewNoteType,
    title: string,
    /** A change to how existing data behaves; listed first with a warning. */
    breaking: boolean,
    /** A main feature of the Release; its type pill takes the accent colour. */
    highlight: boolean,
    /** Markdown, rendered from a small safe subset. */
    description: string,
    /** Same-origin path of a bundled image. */
    image?: string,
    docsUrl?: string,
    articleUrl?: string,
}

export interface WhatsNewRelease {
    release: string,
    /** `YYYY-MM-DD`. */
    date: string,
    notes: readonly WhatsNewNote[],
}

export interface WhatsNewDialogProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    onClose: () => void,
    /** Newest first. */
    releases: readonly WhatsNewRelease[],
}

/** Display order of the types; the label each note carries comes from `ReleaseNoteItem`. */
const ALL_RELEASES_URL = 'https://stagistic.com/changelog';

const TYPE_ORDER: readonly WhatsNewNoteType[] = [
    'feature',
    'improvement',
    'fix',
];

const dateFormat = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
});

const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));

/** `isLatest`: the dialog title already names this Release and its date. */
const ReleaseSection = ({release, isLatest}: {release: WhatsNewRelease, isLatest: boolean}) => {
    const ordered = [
        ...release.notes.filter(note => note.breaking),
        ...TYPE_ORDER.flatMap(type => release.notes.filter(note => !note.breaking && note.type === type)),
    ];

    return (
        <section className={styles.release}>
            {isLatest ? null : (
                <header className={styles.releaseHeader}>
                    <h3 className={styles.releaseNumber}>{release.release}</h3>
                    <time className={styles.releaseDate} dateTime={release.date}>{formatDate(release.date)}</time>
                </header>
            )}
            <ul className={styles.notes}>
                {ordered.map(note => <ReleaseNoteItem key={note.title} note={note} />)}
            </ul>
        </section>
    );
};

export const WhatsNewDialog = ({
    isOpen,
    onClose,
    releases,
    returnFocus,
    fallbackFocus,
}: WhatsNewDialogProps) => {
    const [latest] = releases;

    return (
        <ModalDialog
            ariaLabel="What's new"
            fallbackFocus={fallbackFocus}
            isOpen={isOpen}
            panelClassName={styles.panel}
            returnFocus={returnFocus}
            onClose={onClose}
        >
            <ModalHeader
                title={latest ? `What's new in Release ${latest.release}` : 'What\'s new'}
                aside={latest ? <time dateTime={latest.date}>{formatDate(latest.date)}</time> : undefined}
                onClose={onClose}
            />
            <div className={styles.body}>
                {releases.length === 0
                    ? <p className={styles.empty}>No release notes yet.</p>
                    : releases.map(release => <ReleaseSection key={release.release} isLatest={release === latest} release={release} />)}
            </div>
            <div className={styles.actions}>
                <Link
                    className={clsx(buttonStyles.button, buttonStyles.ghost, buttonStyles.sm)}
                    href={ALL_RELEASES_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    All Releases
                </Link>
                <Button variant="secondary" onPress={onClose}>Close</Button>
            </div>
        </ModalDialog>
    );
};

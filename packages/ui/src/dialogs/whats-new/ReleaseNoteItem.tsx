import {useState} from 'react';

import {SafeMarkdown} from './SafeMarkdown';
import type {WhatsNewNote, WhatsNewNoteType} from './WhatsNewDialog';
import styles from './WhatsNewDialog.module.css';

const TYPE_LABELS: Record<WhatsNewNoteType, string> = {
    feature: 'New',
    improvement: 'Improved',
    fix: 'Fixed',
};

/** Same rule as `getReleaseNoteWeight` in @stagistic/release-notes (pinned by a test in app-routes). */
export const getNoteWeight = (note: WhatsNewNote) => {
    if (note.highlight) {
        return 'highlight';
    }

    return note.type === 'fix' ? 'fix' : 'plain';
};

const NoteImage = ({src}: {src: string}) => {
    const [isBroken, setIsBroken] = useState(false);

    if (isBroken) {
        return null;
    }

    return (
        <img
            alt=""
            className={styles.image}
            src={src}
            onError={() => setIsBroken(true)}
        />
    );
};

export const ReleaseNoteItem = ({note}: {note: WhatsNewNote}) => (
    <li className={styles.note} data-breaking={note.breaking ? '' : undefined}>
        <p className={styles.noteTitle}>
            {note.breaking ? <span className={styles.breakingLabel}>Breaking change</span> : null}
            <span className={styles.noteTitleText}>{note.title}</span>
            <span className={styles.typeLabel} data-note-type={note.type} data-note-weight={getNoteWeight(note)}>{TYPE_LABELS[note.type]}</span>
        </p>
        {note.image ? <NoteImage src={note.image} /> : null}
        <div className={styles.description}>
            <SafeMarkdown source={note.description} />
        </div>
        {note.docsUrl || note.articleUrl ? (
            <p className={styles.links}>
                {note.docsUrl ? (
                    <a href={note.docsUrl} rel="noopener noreferrer" target="_blank">Read the guide</a>
                ) : null}
                {note.articleUrl ? (
                    <a href={note.articleUrl} rel="noopener noreferrer" target="_blank">Read the article</a>
                ) : null}
            </p>
        ) : null}
    </li>
);

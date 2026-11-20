import {Button} from '../../atoms/Button/Button';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import type {ModalFocusRestoreOptions} from '../modal/modalFocusTypes';
import {ModalHeader} from '../modal/ModalHeader';
import {ReleaseNoteItem} from './ReleaseNoteItem';
import type {WhatsNewNote} from './WhatsNewDialog';
import styles from './WhatsNewDialog.module.css';

export interface ReleaseHighlightsDialogProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    onClose: () => void,
    /** The Highlights of every Release the writer has not seen, merged. Breaking notes are shown first. */
    notes: readonly WhatsNewNote[],
    /** Leads to the full What's new dialog. */
    onOpenAllNotes: () => void,
}

export const ReleaseHighlightsDialog = ({
    isOpen,
    onClose,
    notes,
    onOpenAllNotes,
    returnFocus,
    fallbackFocus,
}: ReleaseHighlightsDialogProps) => {
    const ordered = [...notes.filter(note => note.breaking), ...notes.filter(note => !note.breaking)];
    const hasBreaking = ordered.some(note => note.breaking);

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
                title="What's new"
                onClose={onClose}
                description={hasBreaking ? 'One change affects how your existing work behaves. It is listed first.' : undefined}
            />
            <div className={styles.body}>
                <ul className={styles.notes}>
                    {ordered.map((note, index) => <ReleaseNoteItem key={`${index}-${note.title}`} note={note} />)}
                </ul>
            </div>
            <ModalActions>
                <Button data-modal-initial-focus onPress={onClose}>Got it</Button>
                <Button variant="ghost" onPress={onOpenAllNotes}>All release notes</Button>
            </ModalActions>
        </ModalDialog>
    );
};

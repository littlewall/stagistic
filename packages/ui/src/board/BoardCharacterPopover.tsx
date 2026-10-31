import {
    type KeyboardEvent,
    type ReactElement,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Dialog,
    DialogTrigger,
    Popover,
} from 'react-aria-components';

import {Button} from '../atoms/Button/Button';
import {type BoardCharacterChip, CharacterDot} from './BoardCharacterDot';
import styles from './BoardCharacterPopover.module.css';

export interface BoardCharacterActions {
    /** Saves the character's note in this scene; null clears it. */
    onNoteCommit: (chip: BoardCharacterChip, note: string | null) => void,
    /** Takes a character the script does not place in the scene off the card. */
    onRemove: (chip: BoardCharacterChip) => void,
    onConfirm: (chip: BoardCharacterChip) => void,
}

const STATE_LABEL: Record<BoardCharacterChip['source'], string> = {
    script: 'In the scene',
    card: 'Only on this card',
};

const toNote = (text: string) => text.trim() || null;

/*
 * The note saves when the panel closes, however it closes (click outside, Cmd/Ctrl+Enter),
 * except on Escape, which drops the edit. Enter starts a new line.
 */
const NoteField = ({
    chip,
    actions,
    close,
}: {
    chip: BoardCharacterChip,
    actions: BoardCharacterActions,
    close: () => void,
}) => {
    const [draft, setDraft] = useState(chip.note ?? '');
    const latest = useRef({
        actions,
        chip,
        draft,
        isSettled: false,
    });

    /*
     * The Wall rebuilds chip and actions on every parent render, so the commit reads
     * them through this ref instead of the effect's closure, and the effect lives for
     * the panel's lifetime only: a rerender with equivalent props must not save.
     */
    useEffect(() => {
        latest.current.actions = actions;
        latest.current.chip = chip;
        latest.current.draft = draft;
    });

    useEffect(() => () => {
        const {
            actions: currentActions,
            chip: currentChip,
            draft: text,
            isSettled,
        } = latest.current;

        if (!isSettled && toNote(text) !== currentChip.note) currentActions.onNoteCommit(currentChip, toNote(text));
    }, []);

    const settle = (action?: () => void) => {
        latest.current.isSettled = true;
        action?.();
        close();
    };

    /* Capture, so this runs before the dialog closes on Escape wherever it starts from. */
    const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') latest.current.isSettled = true;
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            close();
        }
    };

    return (
        <div className={styles.body} onKeyDownCapture={onKeyDownCapture}>
            <textarea
                className={styles.note}
                aria-label={`Note for ${chip.name}`}
                placeholder={`What does ${chip.name} want or change here?`}
                value={draft}
                rows={3}
                // oxlint-disable-next-line jsx-a11y/no-autofocus -- The panel opens to write the note.
                autoFocus
                onChange={event => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
            />
            <div className={styles.footer}>
                {chip.source === 'card' ? (
                    <Button variant="ghost" size="xs" onPress={() => settle(() => actions.onRemove(chip))}>
                        Remove from card
                    </Button>
                ) : null}
                {chip.source === 'script' && chip.note ? (
                    <Button variant="ghost" size="xs" onPress={() => settle(() => actions.onNoteCommit(chip, null))}>
                        Clear note
                    </Button>
                ) : null}
            </div>
        </div>
    );
};

/** Opens a character on a card: its note, and taking it off the card or confirming it. */
export const BoardCharacterPopover = ({
    chip,
    actions,
    children,
}: {
    chip: BoardCharacterChip,
    actions: BoardCharacterActions,
    /** The pressable trigger. */
    children: ReactElement,
}) => (
    <DialogTrigger>
        {children}
        <Popover className={styles.popover} placement="bottom start" offset={6}>
            <Dialog className={styles.dialog} aria-label={chip.name}>
                {({close}) => (
                    <>
                        <div className={styles.header}>
                            <CharacterDot chip={{...chip, isDimmed: false}} />
                            <span className={styles.name}>{chip.name}</span>
                            <span className={styles.state}>{chip.characterId ? STATE_LABEL[chip.source] : 'Not confirmed'}</span>
                        </div>
                        {chip.characterId ? <NoteField chip={chip} actions={actions} close={close} /> : (
                            <div className={styles.footer}>
                                <Button
                                    variant="secondary"
                                    size="xs"
                                    onPress={() => {
                                        actions.onConfirm(chip);
                                        close();
                                    }}
                                >
                                    Confirm character
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </Dialog>
        </Popover>
    </DialogTrigger>
);

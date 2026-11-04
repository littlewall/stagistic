import clsx from 'clsx';
import type {ReactNode} from 'react';

import {IconButton} from '../atoms/IconButton/IconButton';
import {CloseIcon} from '../icons/ui';
import {
    type BoardCharacterChip,
    CharacterDot,
    SCENE_STATE_TEXT,
} from './BoardCharacterDot';
import type {BoardCharacterActions} from './BoardCharacterPopover';
import {BoardInlineHeading} from './BoardInlineHeading';
import styles from './BoardSceneCast.module.css';
import {CharacterChipStack} from './CharacterChipStack';

export interface BoardSceneCastProps {
    /** In card order: characters with a note first. */
    characters: readonly BoardCharacterChip[],
    /** Omitted on a read-only Board. */
    actions?: BoardCharacterActions,
    /** The control that adds a character, after the dots. */
    addControl?: ReactNode,
}

const NoteRow = ({chip, actions}: {chip: BoardCharacterChip, actions?: BoardCharacterActions}) => (
    <span
        data-source={chip.source}
        className={clsx(styles.row, chip.isDimmed && styles.dimmed)}
    >
        <span className={styles.header}>
            <CharacterDot chip={{...chip, isDimmed: false}} />
            <span data-name="" className={styles.name}>{chip.name}</span>
            <span data-scene-state="" className={styles.state}>{`(${SCENE_STATE_TEXT[chip.source]})`}</span>
            {actions ? (
                <IconButton
                    size="xs"
                    className={styles.clear}
                    aria-label={`Clear note for ${chip.name}`}
                    onPress={() => actions.onNoteCommit(chip, null)}
                >
                    <CloseIcon aria-hidden="true" />
                </IconButton>
            ) : null}
        </span>
        <span data-note="" className={styles.note}>
            <BoardInlineHeading
                kind="outline"
                value={chip.note ?? ''}
                label={`Note for ${chip.name}`}
                isReadOnly={!actions}
                onCommit={next => {
                    actions?.onNoteCommit(chip, next || null);

                    return true;
                }}
            />
        </span>
    </span>
);

/** The characters on a scene card: those with a note as lines of text, the others as dots. */
export const BoardSceneCast = ({
    characters,
    actions,
    addControl,
}: BoardSceneCastProps) => {
    const noted = characters.filter(chip => chip.note);
    const rest = characters.filter(chip => !chip.note);

    if (characters.length === 0 && !addControl) return null;

    return (
        <div className={styles.cast}>
            {noted.length > 0 ? (
                <ul className={styles.notes} aria-label="Character notes">
                    {noted.map(chip => (
                        <li key={chip.id}>
                            <NoteRow chip={chip} actions={actions} />
                        </li>
                    ))}
                </ul>
            ) : null}
            <CharacterChipStack characters={rest} actions={actions} trailing={addControl} />
        </div>
    );
};

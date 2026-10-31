import clsx from 'clsx';
import type {CSSProperties, ReactNode} from 'react';
import {Button as RACButton} from 'react-aria-components';

import {type BoardCharacterChip, describeCharacterChip} from './BoardCharacterDot';
import {type BoardCharacterActions, BoardCharacterPopover} from './BoardCharacterPopover';
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

const NoteRow = ({chip}: {chip: BoardCharacterChip}) => (
    <span
        data-source={chip.source}
        className={clsx(styles.row, chip.source === 'card' && styles.hollow, chip.isDimmed && styles.dimmed)}
        style={chip.color === null ? undefined : {'--chip-color': chip.color} as CSSProperties}
    >
        <span className={styles.name}>{chip.name}</span>
        <span>{chip.note}</span>
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
                            {actions ? (
                                <BoardCharacterPopover chip={chip} actions={actions}>
                                    <RACButton className={styles.rowButton} aria-label={`${describeCharacterChip(chip)}: ${chip.note}`}>
                                        <NoteRow chip={chip} />
                                    </RACButton>
                                </BoardCharacterPopover>
                            ) : <NoteRow chip={chip} />}
                        </li>
                    ))}
                </ul>
            ) : null}
            <CharacterChipStack characters={rest} actions={actions} trailing={addControl} />
        </div>
    );
};

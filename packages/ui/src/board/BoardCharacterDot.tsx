import clsx from 'clsx';
import type {CSSProperties} from 'react';

import styles from './CharacterChipStack.module.css';

export interface BoardCharacterChip {
    /** Unique on the card: the character id, or `key:<KEY>` for an unconfirmed character. */
    id: string,
    /** Null for a character the script has not confirmed. */
    characterId: string | null,
    name: string,
    /** Character color; null for a character the script has not confirmed. */
    color: string | null,
    /** `script`: a cue or tag puts the character in the scene (filled dot); `card`: only the card does (hollow dot). */
    source: 'script' | 'card',
    /** What the character does in the scene, written on the card; null when there is none. */
    note: string | null,
    /** Muted while a character filter highlights other characters. */
    isDimmed?: boolean,
}

export const CharacterDot = ({chip}: {chip: BoardCharacterChip}) => (
    <span
        aria-hidden="true"
        data-source={chip.source}
        data-confirmed={chip.color !== null}
        className={clsx(
            styles.dot,
            chip.color === null && styles.unconfirmed,
            chip.source === 'card' && styles.hollow,
            chip.isDimmed && styles.dimmed,
        )}
        style={chip.color === null ? undefined : {'--chip-color': chip.color} as CSSProperties}
    />
);

/** Says in words what the dot's fill says. */
export const SCENE_STATE_TEXT: Record<BoardCharacterChip['source'], string> = {
    script: 'in scene',
    card: 'not in scene',
};

export const describeCharacterChip = (chip: BoardCharacterChip) => {
    if (chip.characterId === null) return `${chip.name}, not confirmed`;

    return `${chip.name} (${SCENE_STATE_TEXT[chip.source]})`;
};

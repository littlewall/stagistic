import clsx from 'clsx';
import type {CSSProperties} from 'react';

import {Tooltip} from '../atoms/Tooltip/Tooltip';
import styles from './CharacterChipStack.module.css';

export interface BoardCharacterChip {
    id: string,
    name: string,
    /** Character color; null for a character the script has not confirmed. */
    color: string | null,
    level: 'present' | 'mentioned',
    /** Muted while a character filter highlights other characters. */
    isDimmed?: boolean,
}

export interface CharacterChipStackProps {
    characters: readonly BoardCharacterChip[],
}

const MAX_VISIBLE_PER_LEVEL = 8;

const Dot = ({chip}: {chip: BoardCharacterChip}) => (
    <span
        aria-hidden="true"
        data-level={chip.level}
        data-confirmed={chip.color !== null}
        className={clsx(
            styles.dot,
            chip.level === 'mentioned' && styles.mentioned,
            chip.color === null && styles.unconfirmed,
            chip.isDimmed && styles.dimmed,
        )}
        style={chip.color === null ? undefined : {'--chip-color': chip.color} as CSSProperties}
    />
);

const Overflow = ({count}: {count: number}) => count > 0 ? <span aria-hidden="true" className={styles.overflow}>{`+${count}`}</span> : null;

const describe = (chips: readonly BoardCharacterChip[], level: BoardCharacterChip['level']) => chips
    .filter(chip => chip.level === level)
    .map(chip => chip.name)
    .join(', ');

/**
 * Colors of the characters in a scene: filled dots for those on stage, hollow rings for
 * those only mentioned, gray for the unconfirmed. Names appear on hover and keyboard focus.
 */
export const CharacterChipStack = ({characters}: CharacterChipStackProps) => {
    if (characters.length === 0) {
        return null;
    }

    const present = characters.filter(chip => chip.level === 'present');
    const mentioned = characters.filter(chip => chip.level === 'mentioned');
    const presentNames = describe(characters, 'present');
    const mentionedNames = describe(characters, 'mentioned');
    const label = [presentNames, mentionedNames ? `Mentioned: ${mentionedNames}` : ''].filter(Boolean).join('. ');

    return (
        <Tooltip label={label} placement="bottom" delay={200}>
            <button
                type="button"
                className={styles.stack}
                aria-label={`Characters: ${label}`}
            >
                <span className={styles.group}>
                    {present.slice(0, MAX_VISIBLE_PER_LEVEL).map(chip => <Dot key={chip.id} chip={chip} />)}
                    <Overflow count={present.length - MAX_VISIBLE_PER_LEVEL} />
                </span>
                <span className={styles.group}>
                    {mentioned.slice(0, MAX_VISIBLE_PER_LEVEL).map(chip => <Dot key={chip.id} chip={chip} />)}
                    <Overflow count={mentioned.length - MAX_VISIBLE_PER_LEVEL} />
                </span>
            </button>
        </Tooltip>
    );
};

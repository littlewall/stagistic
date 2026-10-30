import clsx from 'clsx';
import type {CSSProperties} from 'react';

import {Tooltip} from '../atoms/Tooltip/Tooltip';
import styles from './CharacterChipStack.module.css';

export interface BoardCharacterChip {
    id: string,
    name: string,
    /** Character color; null for a character the script has not confirmed. */
    color: string | null,
    level: 'present',
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
            chip.color === null && styles.unconfirmed,
            chip.isDimmed && styles.dimmed,
        )}
        style={chip.color === null ? undefined : {'--chip-color': chip.color} as CSSProperties}
    />
);

const Overflow = ({count}: {count: number}) => count > 0 ? <span aria-hidden="true" className={styles.overflow}>{`+${count}`}</span> : null;

/** Character colors in first-appearance order; names appear on hover or focus. */
export const CharacterChipStack = ({characters}: CharacterChipStackProps) => {
    if (characters.length === 0) {
        return null;
    }

    const label = characters.map(chip => chip.name).join(', ');

    return (
        <Tooltip label={label} placement="bottom" delay={200}>
            <button
                type="button"
                className={styles.stack}
                aria-label={`Characters: ${label}`}
            >
                <span className={styles.group}>
                    {characters.slice(0, MAX_VISIBLE_PER_LEVEL).map(chip => <Dot key={chip.id} chip={chip} />)}
                    <Overflow count={characters.length - MAX_VISIBLE_PER_LEVEL} />
                </span>
            </button>
        </Tooltip>
    );
};

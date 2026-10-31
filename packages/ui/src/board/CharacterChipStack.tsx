import clsx from 'clsx';
import type {ReactNode} from 'react';
import {Button as RACButton} from 'react-aria-components';

import {Tooltip} from '../atoms/Tooltip/Tooltip';
import {
    type BoardCharacterChip,
    CharacterDot,
    describeCharacterChip,
} from './BoardCharacterDot';
import {type BoardCharacterActions, BoardCharacterPopover} from './BoardCharacterPopover';
import styles from './CharacterChipStack.module.css';

export type {BoardCharacterChip} from './BoardCharacterDot';

export interface CharacterChipStackProps {
    characters: readonly BoardCharacterChip[],
    /** Makes each dot open its character; omitted on a read-only Board. */
    actions?: BoardCharacterActions,
    /** Sits after the dots, e.g. the control that adds a character. */
    trailing?: ReactNode,
}

const MAX_VISIBLE = 8;

const Overflow = ({count}: {count: number}) => count > 0 ? <span aria-hidden="true" className={styles.overflow}>{`+${count}`}</span> : null;

/*
 * Character colors in card order; names appear on hover or focus. With actions, every dot
 * is its own button that opens the character; read-only, the stack is one button naming all.
 */
export const CharacterChipStack = ({
    characters,
    actions,
    trailing,
}: CharacterChipStackProps) => {
    if (characters.length === 0 && !trailing) {
        return null;
    }

    const label = characters.map(chip => chip.name).join(', ');

    if (actions) {
        return (
            <div
                role="group"
                aria-label={characters.length > 0 ? `Characters: ${label}` : undefined}
                className={clsx(styles.stack, styles.open)}
            >
                {characters.map(chip => (
                    <BoardCharacterPopover key={chip.id} chip={chip} actions={actions}>
                        <Tooltip label={describeCharacterChip(chip)} placement="bottom" delay={200}>
                            <RACButton className={styles.chipButton} aria-label={describeCharacterChip(chip)}>
                                <CharacterDot chip={chip} />
                            </RACButton>
                        </Tooltip>
                    </BoardCharacterPopover>
                ))}
                {trailing}
            </div>
        );
    }

    return (
        <Tooltip label={label} placement="bottom" delay={200}>
            <button
                type="button"
                className={styles.stack}
                aria-label={`Characters: ${label}`}
            >
                <span className={styles.group}>
                    {characters.slice(0, MAX_VISIBLE).map(chip => <CharacterDot key={chip.id} chip={chip} />)}
                    <Overflow count={characters.length - MAX_VISIBLE} />
                </span>
            </button>
        </Tooltip>
    );
};

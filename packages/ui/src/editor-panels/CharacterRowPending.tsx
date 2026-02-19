import {
    Button, Tooltip, TooltipTrigger,
} from 'react-aria-components';

import styles from './EditorSidebar.module.css';
import type {EditorSidebarCharacter} from './types';

type CharacterRowPendingProps = {
    character: EditorSidebarCharacter,
    isConfirmPending: boolean,
    onConfirmCharacter?: (characterKey: string) => void,
};

const getConfirmTooltipLabel = (
    characterKey: string,
    isConfirmPending: boolean,
    onConfirmCharacter?: (characterKey: string) => void,
) => {
    if (isConfirmPending) {
        return `Saving ${characterKey}`;
    }

    if (!onConfirmCharacter) {
        return 'Confirmation unavailable';
    }

    return `Confirm ${characterKey}`;
};

export const CharacterRowPending = ({
    character,
    isConfirmPending,
    onConfirmCharacter,
}: CharacterRowPendingProps) => {
    const isConfirmActionDisabled = isConfirmPending || !onConfirmCharacter;
    const confirmTooltipLabel = getConfirmTooltipLabel(
        character.key,
        isConfirmPending,
        onConfirmCharacter,
    );

    return (
        <div className={styles.characterRow}>
            <TooltipTrigger
                trigger="hover"
                delay={0}
                closeDelay={120}
            >
                <Button
                    className={styles.confirmIconButton}
                    onPress={() => {
                        if (isConfirmActionDisabled) {
                            return;
                        }

                        onConfirmCharacter(character.key);
                    }}
                    aria-disabled={isConfirmActionDisabled}
                    aria-label={isConfirmPending
                        ? `Saving ${character.key}`
                        : `Confirm ${character.key}`}
                >
                    {isConfirmPending ? (
                        <span className={styles.confirmSpinner} aria-hidden="true" />
                    ) : (
                        <svg viewBox="0 0 24 24" className={styles.iconGlyph}>
                            <path d="M20 6 9 17l-4-4" />
                        </svg>
                    )}
                </Button>
                <Tooltip
                    className={styles.confirmTooltip}
                    placement="right"
                    offset={8}
                >
                    {confirmTooltipLabel}
                </Tooltip>
            </TooltipTrigger>
            <span className={styles.characterColor} aria-hidden="true" />
            <span className={styles.characterName}>{character.key}</span>
        </div>
    );
};

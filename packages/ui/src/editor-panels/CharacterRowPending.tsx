import {
    Button, Tooltip, TooltipTrigger,
} from 'react-aria-components';

import {EyeIcon} from '../icons/ui';
import styles from './EditorSidebar.module.css';
import type {EditorSidebarCharacter} from './types';

interface CharacterRowPendingProps {
    model: {
        character: EditorSidebarCharacter,
        isConfirmPending: boolean,
    },
    actions: {
        onConfirmCharacter?: (characterKey: string, colorHex?: string | null) => void,
        onFocusCharacter?: (characterKey: string) => void,
    },
}

const getConfirmTooltipLabel = (
    characterKey: string,
    isConfirmPending: boolean,
    onConfirmCharacter?: (characterKey: string, colorHex?: string | null) => void,
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
    model,
    actions,
}: CharacterRowPendingProps) => {
    const {character, isConfirmPending} = model;
    const {onConfirmCharacter, onFocusCharacter} = actions;
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

                        onConfirmCharacter(character.key, character.color);
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
            <span className={styles.characterColorOutline} aria-hidden="true" />
            <span className={styles.characterName}>{character.key}</span>
            {onFocusCharacter && (
                <TooltipTrigger
                    trigger="hover"
                    delay={0}
                    closeDelay={120}
                >
                    <Button
                        className={styles.focusIconButton}
                        onPress={() => onFocusCharacter(character.key)}
                        aria-label={`Focus ${character.key}`}
                    >
                        <EyeIcon className={styles.iconGlyph} strokeWidth={2} />
                    </Button>
                    <Tooltip
                        className={styles.confirmTooltip}
                        placement="left"
                        offset={8}
                    >
                        Focus first occurrence
                    </Tooltip>
                </TooltipTrigger>
            )}
        </div>
    );
};

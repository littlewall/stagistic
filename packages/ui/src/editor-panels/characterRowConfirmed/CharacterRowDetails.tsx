import {
    Button, Tooltip, TooltipTrigger,
} from 'react-aria-components';

import styles from '../EditorSidebar.module.css';
import type {EditorSidebarCharacter} from '../types';
import {CharacterGenderPopover} from './CharacterGenderPopover';
import type {
    CharacterGenderIcon,
    GenderListOption,
} from './types';

type CharacterRowDetailsProps = {
    character: EditorSidebarCharacter,
    isExpanded: boolean,
    isDeletePending: boolean,
    isDeleteActionDisabled: boolean,
    isGenderActionDisabled: boolean,
    deleteTooltipLabel: string,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
    isGenderPickerOpen: boolean,
    setIsGenderPickerOpen: (nextOpen: boolean) => void,
    selectedGenderLabel: string,
    selectedGenderIcon: CharacterGenderIcon,
    genderQuery: string,
    setGenderQuery: (value: string) => void,
    genderListOptions: GenderListOption[],
    effectiveGenderKey: string | null,
    normalizedGenderInputLabel: string,
    canCreateCustomGender: boolean,
    shouldCloseGenderPopover: (target: Element) => boolean,
    commitGenderQuery: () => Promise<boolean>,
    handleGenderSelection: (nextKey: string) => void,
};

export const CharacterRowDetails = ({
    character,
    isExpanded,
    isDeletePending,
    isDeleteActionDisabled,
    isGenderActionDisabled,
    deleteTooltipLabel,
    onDeleteCharacter,
    isGenderPickerOpen,
    setIsGenderPickerOpen,
    selectedGenderLabel,
    selectedGenderIcon,
    genderQuery,
    setGenderQuery,
    genderListOptions,
    effectiveGenderKey,
    normalizedGenderInputLabel,
    canCreateCustomGender,
    shouldCloseGenderPopover,
    commitGenderQuery,
    handleGenderSelection,
}: CharacterRowDetailsProps) => {
    if (!isExpanded) {
        return null;
    }

    return (
        <div className={styles.characterDetails}>
            <div className={styles.characterMetaRow}>
                <span className={styles.detailLabel}>Occurrences in script</span>
                <span className={styles.detailValue}>{character.count}</span>
            </div>
            <div className={styles.characterCardFooter}>
                <div className={styles.characterFooterLeft}>
                    <CharacterGenderPopover
                        characterKey={character.key}
                        isOpen={isGenderPickerOpen}
                        onOpenChange={nextOpen => {
                            setIsGenderPickerOpen(nextOpen);
                            setGenderQuery('');
                        }}
                        isGenderActionDisabled={isGenderActionDisabled}
                        selectedGenderLabel={selectedGenderLabel}
                        selectedGenderIcon={selectedGenderIcon}
                        genderQuery={genderQuery}
                        onGenderQueryChange={setGenderQuery}
                        genderListOptions={genderListOptions}
                        effectiveGenderKey={effectiveGenderKey}
                        normalizedGenderInputLabel={normalizedGenderInputLabel}
                        canCreateCustomGender={canCreateCustomGender}
                        shouldCloseGenderPopover={shouldCloseGenderPopover}
                        onCommitGenderQuery={commitGenderQuery}
                        onGenderSelection={handleGenderSelection}
                    />
                </div>
                <div className={styles.characterFooterRight}>
                    <TooltipTrigger
                        trigger="hover"
                        delay={0}
                        closeDelay={120}
                    >
                        <Button
                            className={styles.deleteIconButton}
                            aria-disabled={isDeleteActionDisabled}
                            aria-label={isDeletePending ? `Deleting ${character.key}` : `Delete ${character.key}`}
                            onPress={() => {
                                if (isDeleteActionDisabled) {
                                    return;
                                }

                                void onDeleteCharacter?.(character.id ?? '');
                            }}
                        >
                            {isDeletePending ? (
                                <span className={styles.confirmSpinner} aria-hidden="true" />
                            ) : (
                                <svg viewBox="0 0 24 24" className={styles.iconGlyph}>
                                    <path d="M4 7h16" />
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                    <path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
                                    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                            )}
                        </Button>
                        <Tooltip
                            className={styles.confirmTooltip}
                            placement="right"
                            offset={8}
                        >
                            {deleteTooltipLabel}
                        </Tooltip>
                    </TooltipTrigger>
                </div>
            </div>
        </div>
    );
};

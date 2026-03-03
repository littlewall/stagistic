import {
    Button, Tooltip, TooltipTrigger,
} from 'react-aria-components';

import styles from '../EditorSidebar.module.css';
import {CharacterGenderPopover} from './CharacterGenderPopover';
import type {CharacterRowDetailsProps} from './contracts';

export const CharacterRowDetails = ({
    model,
    state,
    actions,
    gender,
}: CharacterRowDetailsProps) => {
    if (!state.isExpanded) {
        return null;
    }

    const {character} = model;

    return (
        <div className={styles.characterDetails}>
            <div className={styles.characterCardFooter}>
                <div className={styles.characterFooterLeft}>
                    <CharacterGenderPopover
                        model={{
                            characterKey: character.key,
                        }}
                        state={{
                            isOpen: gender.state.isPickerOpen,
                            isGenderActionDisabled: gender.state.isActionDisabled,
                            selectedGenderLabel: gender.state.selectedGenderLabel,
                            selectedGenderIcon: gender.state.selectedGenderIcon,
                            genderQuery: gender.state.genderQuery,
                            effectiveGenderKey: gender.state.effectiveGenderKey,
                            normalizedGenderInputLabel: gender.state.normalizedGenderInputLabel,
                            canCreateCustomGender: gender.state.canCreateCustomGender,
                        }}
                        data={{
                            genderListOptions: gender.data.genderListOptions,
                        }}
                        actions={{
                            onOpenChange: nextOpen => {
                                gender.actions.setPickerOpen(nextOpen);
                                gender.actions.setGenderQuery('');
                            },
                            onGenderQueryChange: gender.actions.setGenderQuery,
                            shouldCloseGenderPopover: gender.actions.shouldClosePopover,
                            onCommitGenderQuery: gender.actions.commitGenderQuery,
                            onGenderSelection: gender.actions.selectGender,
                        }}
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
                            aria-disabled={state.isDeleteActionDisabled}
                            aria-label={state.isDeletePending ? `Deleting ${character.key}` : `Delete ${character.key}`}
                            onPress={() => {
                                if (state.isDeleteActionDisabled) {
                                    return;
                                }

                                void actions.onDeleteCharacter?.(character.id ?? '');
                            }}
                        >
                            {state.isDeletePending ? (
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
                            {state.deleteTooltipLabel}
                        </Tooltip>
                    </TooltipTrigger>
                </div>
            </div>
        </div>
    );
};

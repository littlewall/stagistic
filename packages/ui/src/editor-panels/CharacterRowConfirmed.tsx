import type {CharacterCountItem as EditorSidebarCharacter} from '@stagistic/script-core';
import {
    NavArrowDown,
    NavArrowRight,
} from 'iconoir-react';
import {
    Button, Tooltip, TooltipTrigger,
} from 'react-aria-components';

import styles from './EditorSidebar.module.css';
import {isInlineInteractiveTarget} from './utils';

type CharacterRowConfirmedProps = {
    character: EditorSidebarCharacter,
    characterIdentityKey: string,
    isExpanded: boolean,
    isDeletePending: boolean,
    isRenamePending: boolean,
    renameDraft: string,
    onToggleExpanded: (key: string) => void,
    onRenameDraftChange: (characterId: string, characterKey: string, value: string) => void,
    onCommitRenameDraft: (characterId: string, characterKey: string) => void,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
    onRenameCharacter?: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void | Promise<void>,
};

const getDeleteTooltipLabel = (
    characterKey: string,
    isDeletePending: boolean,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
) => {
    if (isDeletePending) {
        return `Deleting ${characterKey}`;
    }

    if (!onDeleteCharacter) {
        return 'Deletion unavailable';
    }

    return `Delete ${characterKey}`;
};

export const CharacterRowConfirmed = ({
    character,
    characterIdentityKey,
    isExpanded,
    isDeletePending,
    isRenamePending,
    renameDraft,
    onToggleExpanded,
    onRenameDraftChange,
    onCommitRenameDraft,
    onDeleteCharacter,
    onRenameCharacter,
}: CharacterRowConfirmedProps) => {
    const isDeleteActionDisabled = isDeletePending
        || isRenamePending
        || !character.id
        || !onDeleteCharacter;
    const isRenameActionDisabled = isRenamePending
        || isDeletePending
        || !character.id
        || !onRenameCharacter;
    const deleteTooltipLabel = getDeleteTooltipLabel(
        character.key,
        isDeletePending,
        onDeleteCharacter,
    );

    return (
        <>
            <div
                className={styles.characterRowButton}
                role="button"
                tabIndex={0}
                aria-label={isExpanded ? `Collapse ${character.key}` : `Expand ${character.key}`}
                aria-expanded={isExpanded}
                onClick={event => {
                    if (isInlineInteractiveTarget(event.target)) {
                        return;
                    }

                    onToggleExpanded(characterIdentityKey);
                }}
                onKeyDown={event => {
                    if (
                        isInlineInteractiveTarget(event.target)
                        || (event.key !== 'Enter' && event.key !== ' ')
                    ) {
                        return;
                    }

                    event.preventDefault();
                    onToggleExpanded(characterIdentityKey);
                }}
            >
                <button
                    type="button"
                    className={styles.expandIndicatorButton}
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={event => {
                        event.stopPropagation();
                        onToggleExpanded(characterIdentityKey);
                    }}
                >
                    {isExpanded ? (
                        <NavArrowDown className={styles.expandIcon} aria-hidden="true" />
                    ) : (
                        <NavArrowRight className={styles.expandIcon} aria-hidden="true" />
                    )}
                </button>
                <span className={styles.characterColor} aria-hidden="true" />
                {isExpanded ? (
                    <input
                        type="text"
                        className={styles.characterInlineRenameInput}
                        value={renameDraft}
                        disabled={isRenameActionDisabled}
                        aria-label={`Rename ${character.key}`}
                        onClick={event => {
                            event.stopPropagation();
                        }}
                        onChange={event => {
                            onRenameDraftChange(
                                character.id ?? '',
                                character.key,
                                event.target.value,
                            );
                        }}
                        onBlur={() => {
                            onCommitRenameDraft(character.id ?? '', character.key);
                        }}
                        onKeyDown={event => {
                            event.stopPropagation();

                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onCommitRenameDraft(character.id ?? '', character.key);
                                event.currentTarget.blur();
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault();
                                onRenameDraftChange(
                                    character.id ?? '',
                                    character.key,
                                    character.key,
                                );
                                event.currentTarget.blur();
                            }
                        }}
                    />
                ) : (
                    <span className={styles.characterName}>{character.key}</span>
                )}
            </div>
            {isExpanded ? (
                <div className={styles.characterDetails}>
                    <div className={styles.characterMetaRow}>
                        <span className={styles.detailLabel}>Occurrences in script</span>
                        <span className={styles.detailValue}>{character.count}</span>
                    </div>
                    <div className={styles.characterMiniToolbar}>
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
            ) : null}
        </>
    );
};

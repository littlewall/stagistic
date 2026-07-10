import {Button} from 'react-aria-components';

import {Tooltip} from '../../atoms/Tooltip';
import {ArrowRightIcon, ChevronDownIcon} from '../../icons/ui';
import styles from '../EditorSidebar.module.css';
import {isInlineInteractiveTarget} from '../utils';
import {CharacterColorControl} from './CharacterColorControl';
import type {CharacterRowHeaderProps} from './contracts';

export const CharacterRowHeader = ({
    model,
    state,
    actions,
    color,
    delete: deleteControls,
    overlay,
}: CharacterRowHeaderProps) => {
    const {
        characterIdentityKey,
        character,
        renameDraft,
    } = model;
    const {isExpanded, isRenameActionDisabled} = state;
    const {
        onToggleExpanded,
        onRenameDraftChange,
        onCommitRenameDraft,
    } = actions;
    const {isCharacterOverlayTarget} = overlay;

    return (
        <div
            className={styles.characterRowButton}
            role="button"
            tabIndex={0}
            aria-label={isExpanded ? `Collapse ${character.key}` : `Expand ${character.key}`}
            aria-expanded={isExpanded}
            onClick={event => {
                if (color.state.isPickerOpen) {
                    return;
                }

                if (isInlineInteractiveTarget(event.target) || isCharacterOverlayTarget(event.target)) {
                    return;
                }

                onToggleExpanded(characterIdentityKey);
            }}
            onKeyDown={event => {
                if (color.state.isPickerOpen) {
                    return;
                }

                if (
                    isInlineInteractiveTarget(event.target)
                    || isCharacterOverlayTarget(event.target)
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
                    <ChevronDownIcon className={styles.expandIcon} aria-hidden="true" />
                ) : (
                    <ArrowRightIcon className={styles.expandIcon} aria-hidden="true" />
                )}
            </button>
            <CharacterColorControl characterKey={character.key} color={color} />
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
                        onRenameDraftChange(character.id ?? '', character.key, event.target.value);
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
                            onRenameDraftChange(character.id ?? '', character.key, character.key);
                            event.currentTarget.blur();
                        }
                    }}
                />
            ) : (
                <span className={styles.characterName}>{character.key}</span>
            )}
            {isExpanded ? (
                <Tooltip
                    label={deleteControls.deleteTooltipLabel}
                    placement="right"
                    closeDelay={120}
                    isDisabled={deleteControls.isDeleteActionDisabled}
                >
                    <Button
                        className={styles.characterHeaderDeleteButton}
                        aria-disabled={deleteControls.isDeleteActionDisabled}
                        aria-label={deleteControls.deleteTooltipLabel}
                        onPress={() => {
                            deleteControls.onRequestDelete();
                        }}
                    >
                        {deleteControls.isDeletePending ? (
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
                </Tooltip>
            ) : null}
        </div>
    );
};

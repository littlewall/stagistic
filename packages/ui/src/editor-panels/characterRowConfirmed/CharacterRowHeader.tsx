import {
    Button, Tooltip, TooltipTrigger,
} from 'react-aria-components';

import {ArrowRightIcon, ChevronDownIcon} from '../../icons/ui';
import styles from '../EditorSidebar.module.css';
import {isInlineInteractiveTarget} from '../utils';
import {CharacterColorPopover} from './CharacterColorPopover';
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
            <TooltipTrigger
                trigger="hover"
                delay={0}
                closeDelay={120}
            >
                <span
                    ref={color.refs.triggerRef}
                    role="button"
                    tabIndex={color.state.isActionDisabled ? -1 : 0}
                    aria-label={`Choose color for ${character.key}`}
                    aria-disabled={color.state.isActionDisabled || undefined}
                    className={styles.characterColorInteractive}
                    onClick={event => {
                        event.stopPropagation();
                        color.actions.togglePicker();
                    }}
                    onKeyDown={event => {
                        event.stopPropagation();

                        if (color.state.isActionDisabled) {
                            return;
                        }

                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            color.actions.togglePicker();
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            color.actions.setPickerOpen(false);
                        }
                    }}
                >
                    <span className={styles.characterColor} aria-hidden="true" />
                </span>
                <Tooltip
                    className={styles.confirmTooltip}
                    placement="right"
                    offset={8}
                >
                    Choose color
                </Tooltip>
            </TooltipTrigger>
            <CharacterColorPopover
                refs={{
                    triggerRef: color.refs.triggerRef,
                }}
                model={{
                    characterKey: character.key,
                    colorDraftHex: color.state.colorDraftHex,
                    pickerColorValue: color.state.pickerColorValue,
                    presetColorHexes: color.state.presetColorHexes,
                    resolvedColorSaturation: color.state.resolvedColorSaturation,
                }}
                state={{
                    isOpen: color.state.isPickerOpen,
                }}
                actions={{
                    onOpenChange: color.actions.setPickerOpen,
                    onHueChange: color.actions.setDraftHue,
                    onApply: color.actions.applyColor,
                    onReset: color.actions.resetColor,
                }}
            />
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
                <TooltipTrigger
                    trigger="hover"
                    delay={0}
                    closeDelay={120}
                >
                    <Button
                        className={styles.characterHeaderDeleteButton}
                        aria-disabled={deleteControls.isDeleteActionDisabled}
                        aria-label={deleteControls.deleteTooltipLabel}
                        onPress={() => {
                            if (deleteControls.isDeleteActionDisabled) {
                                return;
                            }

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
                    <Tooltip
                        className={styles.confirmTooltip}
                        placement="right"
                        offset={8}
                    >
                        {deleteControls.deleteTooltipLabel}
                    </Tooltip>
                </TooltipTrigger>
            ) : null}
        </div>
    );
};

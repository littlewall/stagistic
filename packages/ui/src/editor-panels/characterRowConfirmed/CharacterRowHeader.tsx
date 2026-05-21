import {ArrowRightIcon, ChevronDownIcon} from '../../icons/ui';
import {Tooltip, TooltipTrigger} from 'react-aria-components';

import styles from '../EditorSidebar.module.css';
import {isInlineInteractiveTarget} from '../utils';
import {CharacterColorPopover} from './CharacterColorPopover';
import type {CharacterRowHeaderProps} from './contracts';

export const CharacterRowHeader = ({
    model,
    state,
    actions,
    color,
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
            {isExpanded ? (
                <>
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
                </>
            ) : (
                <span className={styles.characterColor} aria-hidden="true" />
            )}
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
        </div>
    );
};

import {NavArrowDown, NavArrowRight} from 'iconoir-react';
import type {ComponentProps, RefObject} from 'react';
import {Tooltip, TooltipTrigger} from 'react-aria-components';

import styles from '../EditorSidebar.module.css';
import type {EditorSidebarCharacter} from '../types';
import {isInlineInteractiveTarget} from '../utils';
import {CharacterColorPopover} from './CharacterColorPopover';

type CharacterRowHeaderProps = {
    character: EditorSidebarCharacter,
    characterIdentityKey: string,
    isExpanded: boolean,
    renameDraft: string,
    isColorActionDisabled: boolean,
    isRenameActionDisabled: boolean,
    isColorPickerOpen: boolean,
    colorTriggerRef: RefObject<HTMLSpanElement | null>,
    colorDraftHex: string,
    pickerColorValue: ComponentProps<typeof CharacterColorPopover>['pickerColorValue'],
    presetColorHexes: string[],
    resolvedColorSaturation: number,
    onToggleExpanded: (key: string) => void,
    onRenameDraftChange: (characterId: string, characterKey: string, value: string) => void,
    onCommitRenameDraft: (characterId: string, characterKey: string) => void,
    onToggleColorPicker: () => void,
    onSetColorPickerOpen: (nextOpen: boolean) => void,
    onApplyColor: () => void,
    onResetColor: () => void,
    onSetColorDraftHue: (hue: number) => void,
    isCharacterOverlayTarget: (target: EventTarget | null) => boolean,
};

export const CharacterRowHeader = ({
    character,
    characterIdentityKey,
    isExpanded,
    renameDraft,
    isColorActionDisabled,
    isRenameActionDisabled,
    isColorPickerOpen,
    colorTriggerRef,
    colorDraftHex,
    pickerColorValue,
    presetColorHexes,
    resolvedColorSaturation,
    onToggleExpanded,
    onRenameDraftChange,
    onCommitRenameDraft,
    onToggleColorPicker,
    onSetColorPickerOpen,
    onApplyColor,
    onResetColor,
    onSetColorDraftHue,
    isCharacterOverlayTarget,
}: CharacterRowHeaderProps) => {
    return (
        <div
            className={styles.characterRowButton}
            role="button"
            tabIndex={0}
            aria-label={isExpanded ? `Collapse ${character.key}` : `Expand ${character.key}`}
            aria-expanded={isExpanded}
            onClick={event => {
                if (isColorPickerOpen) {
                    return;
                }

                if (isInlineInteractiveTarget(event.target) || isCharacterOverlayTarget(event.target)) {
                    return;
                }

                onToggleExpanded(characterIdentityKey);
            }}
            onKeyDown={event => {
                if (isColorPickerOpen) {
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
                    <NavArrowDown className={styles.expandIcon} aria-hidden="true" />
                ) : (
                    <NavArrowRight className={styles.expandIcon} aria-hidden="true" />
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
                            ref={colorTriggerRef}
                            role="button"
                            tabIndex={isColorActionDisabled ? -1 : 0}
                            aria-label={`Choose color for ${character.key}`}
                            aria-disabled={isColorActionDisabled || undefined}
                            className={styles.characterColorInteractive}
                            onClick={event => {
                                event.stopPropagation();
                                onToggleColorPicker();
                            }}
                            onKeyDown={event => {
                                event.stopPropagation();

                                if (isColorActionDisabled) {
                                    return;
                                }

                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onToggleColorPicker();
                                }

                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    onSetColorPickerOpen(false);
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
                        isOpen={isColorPickerOpen}
                        triggerRef={colorTriggerRef}
                        characterKey={character.key}
                        colorDraftHex={colorDraftHex}
                        pickerColorValue={pickerColorValue}
                        presetColorHexes={presetColorHexes}
                        resolvedColorSaturation={resolvedColorSaturation}
                        onOpenChange={onSetColorPickerOpen}
                        onHueChange={onSetColorDraftHue}
                        onApply={onApplyColor}
                        onReset={onResetColor}
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

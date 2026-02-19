import {useCallback} from 'react';

import {CharacterRowDetails} from './characterRowConfirmed/CharacterRowDetails';
import {CharacterRowHeader} from './characterRowConfirmed/CharacterRowHeader';
import {getDeleteTooltipLabel} from './characterRowConfirmed/genderUtils';
import type {CharacterRowConfirmedProps} from './characterRowConfirmed/types';
import {useCharacterColorPickerState} from './characterRowConfirmed/useCharacterColorPickerState';
import {useCharacterGenderPickerState} from './characterRowConfirmed/useCharacterGenderPickerState';
import styles from './EditorSidebar.module.css';

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
    characterGenderOptions,
    onSetCharacterColor,
    onSetCharacterGender,
    onUpsertCharacterGender,
    characterColorSaturation,
}: CharacterRowConfirmedProps) => {
    const isDeleteActionDisabled = isDeletePending
        || isRenamePending
        || !character.id
        || !onDeleteCharacter;
    const isRenameActionDisabled = isRenamePending
        || isDeletePending
        || !character.id
        || !onRenameCharacter;
    const isColorActionDisabled = isDeletePending
        || isRenamePending
        || !character.id
        || !onSetCharacterColor;
    const isGenderActionDisabled = isDeletePending
        || isRenamePending
        || !character.id
        || !onSetCharacterGender;
    const deleteTooltipLabel = getDeleteTooltipLabel(
        character.key,
        isDeletePending,
        onDeleteCharacter,
    );

    const {
        resolvedColorSaturation,
        colorTriggerRef,
        isColorPickerOpen,
        setIsColorPickerOpen,
        colorDraftHex,
        pickerColorValue,
        presetColorHexes,
        setColorDraftHue,
        toggleColorPicker,
        applyColor,
        resetColor,
    } = useCharacterColorPickerState({
        character,
        isColorActionDisabled,
        onSetCharacterColor,
        characterColorSaturation,
    });

    const {
        effectiveGenderKey,
        selectedGenderLabel,
        selectedGenderIcon,
        genderQuery,
        setGenderQuery,
        isGenderPickerOpen,
        setIsGenderPickerOpen,
        genderListOptions,
        normalizedGenderInputLabel,
        canCreateCustomGender,
        shouldCloseGenderPopover,
        commitGenderQuery,
        handleGenderSelection,
    } = useCharacterGenderPickerState({
        character,
        characterGenderOptions,
        isGenderActionDisabled,
        onSetCharacterGender,
        onUpsertCharacterGender,
    });

    const isCharacterOverlayTarget = useCallback((target: EventTarget | null) => {
        if (!(target instanceof Node)) {
            return false;
        }

        const element = target instanceof HTMLElement
            ? target
            : target.parentElement;

        if (!element) {
            return false;
        }

        return Boolean(
            element.closest(`.${styles.characterColorPopover}`)
            || element.closest(`.${styles.characterGenderPickerPopover}`),
        );
    }, []);

    return (
        <>
            <CharacterRowHeader
                character={character}
                characterIdentityKey={characterIdentityKey}
                isExpanded={isExpanded}
                renameDraft={renameDraft}
                isColorActionDisabled={isColorActionDisabled}
                isRenameActionDisabled={isRenameActionDisabled}
                isColorPickerOpen={isColorPickerOpen}
                colorTriggerRef={colorTriggerRef}
                colorDraftHex={colorDraftHex}
                pickerColorValue={pickerColorValue}
                presetColorHexes={presetColorHexes}
                resolvedColorSaturation={resolvedColorSaturation}
                onToggleExpanded={onToggleExpanded}
                onRenameDraftChange={onRenameDraftChange}
                onCommitRenameDraft={onCommitRenameDraft}
                onToggleColorPicker={toggleColorPicker}
                onSetColorPickerOpen={setIsColorPickerOpen}
                onApplyColor={applyColor}
                onResetColor={resetColor}
                onSetColorDraftHue={setColorDraftHue}
                isCharacterOverlayTarget={isCharacterOverlayTarget}
            />
            <CharacterRowDetails
                character={character}
                isExpanded={isExpanded}
                isDeletePending={isDeletePending}
                isDeleteActionDisabled={isDeleteActionDisabled}
                isGenderActionDisabled={isGenderActionDisabled}
                deleteTooltipLabel={deleteTooltipLabel}
                onDeleteCharacter={onDeleteCharacter}
                isGenderPickerOpen={isGenderPickerOpen}
                setIsGenderPickerOpen={setIsGenderPickerOpen}
                selectedGenderLabel={selectedGenderLabel}
                selectedGenderIcon={selectedGenderIcon}
                genderQuery={genderQuery}
                setGenderQuery={setGenderQuery}
                genderListOptions={genderListOptions}
                effectiveGenderKey={effectiveGenderKey}
                normalizedGenderInputLabel={normalizedGenderInputLabel}
                canCreateCustomGender={canCreateCustomGender}
                shouldCloseGenderPopover={shouldCloseGenderPopover}
                commitGenderQuery={commitGenderQuery}
                handleGenderSelection={handleGenderSelection}
            />
        </>
    );
};

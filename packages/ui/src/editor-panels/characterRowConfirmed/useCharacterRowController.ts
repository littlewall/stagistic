import {useCallback} from 'react';

import styles from '../EditorSidebar.module.css';
import type {
    CharacterRowControllerArgs,
    CharacterRowControllerResult,
} from './contracts';
import {getDeleteTooltipLabel} from './genderUtils';
import {useCharacterColorPickerState} from './useCharacterColorPickerState';
import {useCharacterGenderPickerState} from './useCharacterGenderPickerState';

export const useCharacterRowController = ({
    model,
    state,
    actions,
    options,
}: CharacterRowControllerArgs): CharacterRowControllerResult => {
    const isDeleteActionDisabled = state.isDeletePending
        || state.isRenamePending
        || !model.character.id
        || !actions.onDeleteCharacter;
    const isRenameActionDisabled = state.isRenamePending
        || state.isDeletePending
        || !model.character.id
        || !actions.onRenameCharacter;
    const isColorActionDisabled = state.isDeletePending
        || state.isRenamePending
        || !model.character.id
        || !actions.onSetCharacterColor;
    const isGenderActionDisabled = state.isDeletePending
        || state.isRenamePending
        || !model.character.id
        || !actions.onSetCharacterGender;
    const deleteTooltipLabel = getDeleteTooltipLabel(
        model.character.key,
        state.isDeletePending,
        actions.onDeleteCharacter,
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
        character: model.character,
        isColorActionDisabled,
        onSetCharacterColor: actions.onSetCharacterColor,
        characterColorSaturation: options.characterColorSaturation,
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
        character: model.character,
        characterGenderOptions: options.characterGenderOptions,
        isGenderActionDisabled,
        onSetCharacterGender: actions.onSetCharacterGender,
        onUpsertCharacterGender: actions.onUpsertCharacterGender,
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

    return {
        headerProps: {
            model,
            state: {
                isExpanded: state.isExpanded,
                isRenameActionDisabled,
            },
            actions: {
                onToggleExpanded: actions.onToggleExpanded,
                onRenameDraftChange: actions.onRenameDraftChange,
                onCommitRenameDraft: actions.onCommitRenameDraft,
            },
            color: {
                state: {
                    isActionDisabled: isColorActionDisabled,
                    isPickerOpen: isColorPickerOpen,
                    colorDraftHex,
                    pickerColorValue,
                    presetColorHexes,
                    resolvedColorSaturation,
                },
                refs: {
                    triggerRef: colorTriggerRef,
                },
                actions: {
                    togglePicker: toggleColorPicker,
                    setPickerOpen: setIsColorPickerOpen,
                    applyColor,
                    resetColor,
                    setDraftHue: setColorDraftHue,
                },
            },
            overlay: {
                isCharacterOverlayTarget,
            },
        },
        detailsProps: {
            model: {
                character: model.character,
            },
            state: {
                isExpanded: state.isExpanded,
                isDeletePending: state.isDeletePending,
                isDeleteActionDisabled,
                deleteTooltipLabel,
            },
            actions: {
                onDeleteCharacter: actions.onDeleteCharacter,
            },
            gender: {
                state: {
                    isActionDisabled: isGenderActionDisabled,
                    isPickerOpen: isGenderPickerOpen,
                    selectedGenderLabel,
                    selectedGenderIcon,
                    genderQuery,
                    effectiveGenderKey,
                    normalizedGenderInputLabel,
                    canCreateCustomGender,
                },
                data: {
                    genderListOptions,
                },
                actions: {
                    setPickerOpen: setIsGenderPickerOpen,
                    setGenderQuery,
                    shouldClosePopover: shouldCloseGenderPopover,
                    commitGenderQuery,
                    selectGender: handleGenderSelection,
                },
            },
        },
    };
};

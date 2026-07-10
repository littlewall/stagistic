import {useCallback} from 'react';

import styles from '../EditorSidebar.module.css';
import type {
    CharacterRowControllerArgs,
    CharacterRowControllerResult,
} from './contracts';
import {useCharacterColorPickerState} from './useCharacterColorPickerState';

const getDeleteTooltipLabel = (
    characterKey: string,
    isDeletePending: boolean,
    canDelete: boolean,
) => {
    if (isDeletePending) {
        return `Removing ${characterKey}`;
    }

    if (!canDelete) {
        return 'Removal unavailable';
    }

    return `Remove ${characterKey}`;
};

export const useCharacterRowController = ({
    model,
    state,
    actions,
    options,
}: CharacterRowControllerArgs): CharacterRowControllerResult => {
    const isDeleteActionDisabled = state.isDeletePending
        || state.isRenamePending
        || !model.character.id
        || !actions.onRequestDeleteCharacter;
    const isRenameActionDisabled = state.isRenamePending
        || state.isDeletePending
        || !model.character.id
        || !actions.onRenameCharacter;
    const isColorActionDisabled = state.isDeletePending
        || state.isRenamePending
        || !model.character.id
        || !actions.onSetCharacterColor;
    const deleteTooltipLabel = getDeleteTooltipLabel(
        model.character.key,
        state.isDeletePending,
        Boolean(model.character.id && actions.onRequestDeleteCharacter),
    );

    const requestDeleteCharacter = useCallback(() => {
        if (state.isDeletePending || state.isRenamePending) {
            return;
        }

        actions.onRequestDeleteCharacter?.(model.character.id ?? '', model.character.key);
    }, [
        actions,
        model.character.id,
        model.character.key,
        state.isDeletePending,
        state.isRenamePending,
    ]);

    const {
        resolvedColorSaturation,
        currentCharacterColorHex,
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

        return Boolean(element.closest(`.${styles.characterColorPopover}`));
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
                    currentColorHex: currentCharacterColorHex,
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
            delete: {
                isDeletePending: state.isDeletePending,
                isDeleteActionDisabled,
                deleteTooltipLabel,
                onRequestDelete: requestDeleteCharacter,
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
            },
            actions: {
                onSetCharacterOutline: actions.onSetCharacterOutline,
            },
        },
    };
};

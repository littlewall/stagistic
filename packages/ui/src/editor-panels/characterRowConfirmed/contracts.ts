import type {ComponentProps, RefObject} from 'react';
import type {ColorSlider} from 'react-aria-components';

import type {EditorSidebarCharacter} from '../types';

export interface CharacterRowModel {
    character: EditorSidebarCharacter,
    characterIdentityKey: string,
    renameDraft: string,
}

export interface CharacterRowState {
    isExpanded: boolean,
    isDeletePending: boolean,
    isRenamePending: boolean,
}

export interface CharacterRowActions {
    onToggleExpanded: (key: string) => void,
    onRenameDraftChange: (characterId: string, characterKey: string, value: string) => void,
    onCommitRenameDraft: (characterId: string, characterKey: string) => void,
    onRequestDeleteCharacter?: (characterId: string, characterKey: string) => void,
    onRenameCharacter?: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void | Promise<void>,
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    onSetCharacterOutline?: (characterId: string, outline: string | null) => void,
}

export interface CharacterRowOptions {
    characterColorSaturation?: number,
}

export interface CharacterRowColorControls {
    state: {
        isActionDisabled: boolean,
        isPickerOpen: boolean,
        currentColorHex: string,
        colorDraftHex: string,
        pickerColorValue: ComponentProps<typeof ColorSlider>['value'],
        presetColorHexes: string[],
        resolvedColorSaturation: number,
    },
    refs: {
        triggerRef: RefObject<HTMLSpanElement | null>,
    },
    actions: {
        togglePicker: () => void,
        setPickerOpen: (nextOpen: boolean) => void,
        applyColor: () => void,
        resetColor: () => void,
        setDraftHue: (hue: number) => void,
    },
}

export interface CharacterRowDeleteControls {
    isDeletePending: boolean,
    isDeleteActionDisabled: boolean,
    deleteTooltipLabel: string,
    onRequestDelete: () => void,
}

export interface CharacterRowHeaderProps {
    model: CharacterRowModel,
    state: {
        isExpanded: boolean,
        isRenameActionDisabled: boolean,
    },
    actions: {
        onToggleExpanded: (key: string) => void,
        onRenameDraftChange: (characterId: string, characterKey: string, value: string) => void,
        onCommitRenameDraft: (characterId: string, characterKey: string) => void,
    },
    color: CharacterRowColorControls,
    delete: CharacterRowDeleteControls,
    overlay: {
        isCharacterOverlayTarget: (target: EventTarget | null) => boolean,
    },
}

export interface CharacterRowDetailsProps {
    model: Pick<CharacterRowModel, 'character'>,
    state: {
        isExpanded: boolean,
    },
    actions: {
        onSetCharacterOutline?: (characterId: string, outline: string | null) => void,
    },
}

export interface CharacterRowControllerArgs {
    model: CharacterRowModel,
    state: CharacterRowState,
    actions: CharacterRowActions,
    options: CharacterRowOptions,
}

export interface CharacterRowControllerResult {
    headerProps: CharacterRowHeaderProps,
    detailsProps: CharacterRowDetailsProps,
}

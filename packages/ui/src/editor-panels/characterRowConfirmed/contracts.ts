import type {ComponentProps, RefObject} from 'react';
import type {ColorSlider} from 'react-aria-components';

import type {
    CharacterGenderOption,
    EditorSidebarCharacter,
} from '../types';

export type CharacterGenderIcon = 'male' | 'female' | 'neutral';

export interface GenderListOption extends CharacterGenderOption {
    isUnspecified?: boolean,
}

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
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
    onRenameCharacter?: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void | Promise<void>,
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    onSetCharacterGender?: (characterId: string, genderKey: string | null) => void,
    onUpsertCharacterGender?: (label: string) => Promise<CharacterGenderOption | null>,
}

export interface CharacterRowOptions {
    characterGenderOptions: CharacterGenderOption[],
    characterColorSaturation?: number,
}

export interface CharacterRowColorControls {
    state: {
        isActionDisabled: boolean,
        isPickerOpen: boolean,
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

export interface CharacterRowGenderControls {
    state: {
        isActionDisabled: boolean,
        isPickerOpen: boolean,
        selectedGenderLabel: string,
        selectedGenderIcon: CharacterGenderIcon,
        genderQuery: string,
        effectiveGenderKey: string | null,
        normalizedGenderInputLabel: string,
        canCreateCustomGender: boolean,
    },
    data: {
        genderListOptions: GenderListOption[],
    },
    actions: {
        setPickerOpen: (nextOpen: boolean) => void,
        setGenderQuery: (value: string) => void,
        shouldClosePopover: (target: Element) => boolean,
        commitGenderQuery: () => Promise<boolean>,
        selectGender: (nextKey: string) => void,
    },
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
    overlay: {
        isCharacterOverlayTarget: (target: EventTarget | null) => boolean,
    },
}

export interface CharacterRowDetailsProps {
    model: Pick<CharacterRowModel, 'character'>,
    state: {
        isExpanded: boolean,
        isDeletePending: boolean,
        isDeleteActionDisabled: boolean,
        deleteTooltipLabel: string,
    },
    actions: {
        onDeleteCharacter?: (characterId: string) => void | Promise<void>,
    },
    gender: CharacterRowGenderControls,
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

import type {
    ComponentProps,
    RefObject,
} from 'react';
import type {ColorSlider} from 'react-aria-components';

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

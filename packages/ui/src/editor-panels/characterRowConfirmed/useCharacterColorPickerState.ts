import {clampCharacterColorSaturation} from '@stagistic/script';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from '../EditorSidebar.module.css';
import type {EditorSidebarCharacter} from '../types';
import {
    getPastelHexFromHue,
    getPastelHueFromHex,
    getPickerColorValue,
    normalizeHexColor,
} from './colorUtils';
import {
    DEFAULT_COLOR_HEX,
    PRESET_COLOR_HUES,
} from './constants';

interface UseCharacterColorPickerStateArgs {
    character: EditorSidebarCharacter,
    isColorActionDisabled: boolean,
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    characterColorSaturation?: number,
}

export const useCharacterColorPickerState = ({
    character,
    isColorActionDisabled,
    onSetCharacterColor,
    characterColorSaturation,
}: UseCharacterColorPickerStateArgs) => {
    const resolvedColorSaturation = clampCharacterColorSaturation(characterColorSaturation);
    const currentCharacterColorHex = normalizeHexColor(character.color)
        ?? DEFAULT_COLOR_HEX;
    const colorTriggerRef = useRef<HTMLSpanElement | null>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [colorDraftHue, setColorDraftHue] = useState(
        getPastelHueFromHex(currentCharacterColorHex, resolvedColorSaturation),
    );
    const colorDraftHex = useMemo(
        () => getPastelHexFromHue(colorDraftHue, resolvedColorSaturation),
        [colorDraftHue, resolvedColorSaturation],
    );
    const pickerColorValue = useMemo(
        () => getPickerColorValue(colorDraftHex, resolvedColorSaturation),
        [colorDraftHex, resolvedColorSaturation],
    );
    const presetColorHexes = useMemo(
        () => PRESET_COLOR_HUES.map(hue => getPastelHexFromHue(hue, resolvedColorSaturation)),
        [resolvedColorSaturation],
    );

    useEffect(() => {
        if (isColorPickerOpen) {
            return;
        }

        setColorDraftHue(getPastelHueFromHex(currentCharacterColorHex, resolvedColorSaturation));
    }, [
        currentCharacterColorHex,
        isColorPickerOpen,
        resolvedColorSaturation,
    ]);

    useEffect(() => {
        if (!isColorPickerOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            const targetElement = target instanceof HTMLElement
                ? target
                : target.parentElement;

            if (!targetElement) {
                return;
            }

            const isInsideColorPopover = Boolean(targetElement.closest(`.${styles.characterColorPopover}`));
            const isColorTriggerTarget = Boolean(colorTriggerRef.current?.contains(targetElement));

            if (isInsideColorPopover || isColorTriggerTarget) {
                return;
            }

            setIsColorPickerOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [isColorPickerOpen]);

    const toggleColorPicker = () => {
        if (isColorActionDisabled) {
            return;
        }

        setIsColorPickerOpen(previous => {
            const nextOpen = !previous;

            if (nextOpen) {
                setColorDraftHue(
                    getPastelHueFromHex(currentCharacterColorHex, resolvedColorSaturation),
                );
            }

            return nextOpen;
        });
    };

    const closeColorPicker = () => {
        setIsColorPickerOpen(false);
    };

    const applyColor = () => {
        if (isColorActionDisabled || !character.id) {
            return;
        }

        const nextColorHex = normalizeHexColor(colorDraftHex)
            ?? currentCharacterColorHex;

        onSetCharacterColor?.(character.id, nextColorHex);
        closeColorPicker();
    };

    const resetColor = () => {
        if (isColorActionDisabled || !character.id) {
            return;
        }

        onSetCharacterColor?.(character.id, null);
        closeColorPicker();
    };

    return {
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
        closeColorPicker,
        applyColor,
        resetColor,
    };
};

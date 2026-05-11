import type {ComponentProps, RefObject} from 'react';
import {
    Button,
    ColorSlider,
    ColorSwatch,
    ColorThumb,
    Dialog,
    Popover,
    SliderTrack,
} from 'react-aria-components';

import styles from '../EditorSidebar.module.css';
import {getPastelHueFromHex} from './colorUtils';

interface CharacterColorPopoverProps {
    refs: {
        triggerRef: RefObject<HTMLSpanElement | null>,
    },
    model: {
        characterKey: string,
        colorDraftHex: string,
        pickerColorValue: ComponentProps<typeof ColorSlider>['value'],
        presetColorHexes: string[],
        resolvedColorSaturation: number,
    },
    state: {
        isOpen: boolean,
    },
    actions: {
        onOpenChange: (nextOpen: boolean) => void,
        onHueChange: (hue: number) => void,
        onApply: () => void,
        onReset: () => void,
    },
}

export const CharacterColorPopover = ({
    refs,
    model,
    state,
    actions,
}: CharacterColorPopoverProps) => {
    const {triggerRef} = refs;
    const {
        characterKey,
        colorDraftHex,
        pickerColorValue,
        presetColorHexes,
        resolvedColorSaturation,
    } = model;
    const {isOpen} = state;
    const {
        onOpenChange,
        onHueChange,
        onApply,
        onReset,
    } = actions;

    if (!isOpen || !triggerRef.current) {
        return null;
    }

    return (
        <Popover
            isOpen={isOpen}
            triggerRef={triggerRef}
            placement="bottom start"
            offset={6}
            className={styles.characterColorPopover}
            shouldCloseOnInteractOutside={() => false}
            onOpenChange={onOpenChange}
        >
            <Dialog
                className={styles.characterColorDialog}
                aria-label={`Color picker for ${characterKey}`}
            >
                <div className={styles.characterColorPickerLayout}>
                    <ColorSwatch
                        color={colorDraftHex}
                        className={styles.characterColorPreview}
                        aria-label={`Preview color for ${characterKey}`}
                    />
                    <ColorSlider
                        colorSpace="hsl"
                        channel="hue"
                        value={pickerColorValue}
                        onChange={value => {
                            onHueChange(value.getChannelValue('hue'));
                        }}
                        className={styles.characterColorSlider}
                    >
                        <SliderTrack className={styles.characterColorSliderTrack}>
                            <ColorThumb className={styles.characterColorThumb} />
                        </SliderTrack>
                    </ColorSlider>
                    <div className={styles.characterColorSwatches}>
                        {presetColorHexes.map((presetColorHex, index) => (
                            <Button
                                key={presetColorHex}
                                className={styles.characterColorSwatch}
                                data-selected={presetColorHex === colorDraftHex || undefined}
                                aria-label={`Select preset color ${index + 1}`}
                                onPress={() => {
                                    onHueChange(
                                        getPastelHueFromHex(presetColorHex, resolvedColorSaturation),
                                    );
                                }}
                            >
                                <ColorSwatch
                                    color={presetColorHex}
                                    className={styles.characterColorSwatchFill}
                                />
                            </Button>
                        ))}
                    </div>
                </div>
                <div className={styles.characterColorActions}>
                    <Button className={styles.characterColorActionButton} onPress={onApply}>
                        Apply
                    </Button>
                    <Button className={styles.characterColorActionButtonSecondary} onPress={onReset}>
                        Reset
                    </Button>
                </div>
            </Dialog>
        </Popover>
    );
};

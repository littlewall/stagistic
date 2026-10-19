import clsx from 'clsx';
import {type CSSProperties, type KeyboardEvent} from 'react';

import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import styles from '../EditorSidebar.module.css';
import {CharacterColorPopover} from './CharacterColorPopover';
import type {CharacterRowColorControls} from './contracts';

interface CharacterColorControlProps {
    characterKey: string,
    color: CharacterRowColorControls,
    className?: string,
    swatchClassName?: string,
}

export const CharacterColorControl = ({
    characterKey,
    color,
    className,
    swatchClassName,
}: CharacterColorControlProps) => {
    const {
        state,
        actions,
        refs,
    } = color;
    const {triggerRef} = refs;
    const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
        event.stopPropagation();

        if (state.isActionDisabled) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            actions.togglePicker();
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            actions.setPickerOpen(false);
        }
    };

    return (
        <>
            <Tooltip
                label="Choose color"
                placement="right"
                isDisabled={state.isActionDisabled}
            >
                <span
                    ref={triggerRef}
                    role="button"
                    tabIndex={state.isActionDisabled ? -1 : 0}
                    aria-label={`Choose color for ${characterKey}`}
                    aria-disabled={state.isActionDisabled || undefined}
                    className={clsx(styles.characterColorInteractive, className)}
                    style={{'--character-color': state.currentColorHex} as CSSProperties}
                    onClick={event => {
                        event.stopPropagation();
                        actions.togglePicker();
                    }}
                    onKeyDown={handleKeyDown}
                >
                    <span
                        className={clsx(styles.characterColor, swatchClassName)}
                        aria-hidden="true"
                    />
                </span>
            </Tooltip>
            <CharacterColorPopover
                triggerRef={triggerRef}
                model={{
                    characterKey,
                    colorDraftHex: state.colorDraftHex,
                    pickerColorValue: state.pickerColorValue,
                    presetColorHexes: state.presetColorHexes,
                    resolvedColorSaturation: state.resolvedColorSaturation,
                }}
                state={{
                    isOpen: state.isPickerOpen,
                }}
                actions={{
                    onOpenChange: actions.setPickerOpen,
                    onHueChange: actions.setDraftHue,
                    onApply: actions.applyColor,
                    onReset: actions.resetColor,
                }}
            />
        </>
    );
};

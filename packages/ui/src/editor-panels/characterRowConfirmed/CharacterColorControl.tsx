import clsx from 'clsx';
import {
    type CSSProperties,
    type KeyboardEvent,
} from 'react';

import {Tooltip} from '../../atoms/Tooltip';
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
    const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
        event.stopPropagation();

        if (color.state.isActionDisabled) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            color.actions.togglePicker();
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            color.actions.setPickerOpen(false);
        }
    };

    return (
        <>
            <Tooltip
                label="Choose color"
                placement="right"
                isDisabled={color.state.isActionDisabled}
            >
                <span
                    ref={color.refs.triggerRef}
                    role="button"
                    tabIndex={color.state.isActionDisabled ? -1 : 0}
                    aria-label={`Choose color for ${characterKey}`}
                    aria-disabled={color.state.isActionDisabled || undefined}
                    className={clsx(styles.characterColorInteractive, className)}
                    style={{'--character-color': color.state.currentColorHex} as CSSProperties}
                    onClick={event => {
                        event.stopPropagation();
                        color.actions.togglePicker();
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
                refs={{
                    triggerRef: color.refs.triggerRef,
                }}
                model={{
                    characterKey,
                    colorDraftHex: color.state.colorDraftHex,
                    pickerColorValue: color.state.pickerColorValue,
                    presetColorHexes: color.state.presetColorHexes,
                    resolvedColorSaturation: color.state.resolvedColorSaturation,
                }}
                state={{
                    isOpen: color.state.isPickerOpen,
                }}
                actions={{
                    onOpenChange: color.actions.setPickerOpen,
                    onHueChange: color.actions.setDraftHue,
                    onApply: color.actions.applyColor,
                    onReset: color.actions.resetColor,
                }}
            />
        </>
    );
};

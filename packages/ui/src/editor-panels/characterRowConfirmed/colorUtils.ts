import {normalizeCharacterColorHex} from '@stagistic/script';
import {parseColor} from 'react-aria-components';

import {
    DEFAULT_COLOR_HEX,
    PASTEL_LIGHTNESS,
} from './constants';

export {normalizeCharacterColorHex as normalizeHexColor};

export const getPickerColorValue = (hexColor: string, saturationPercent: number) => {
    try {
        const hsl = parseColor(hexColor).toFormat('hsl');

        return hsl
            .withChannelValue('saturation', saturationPercent)
            .withChannelValue('lightness', PASTEL_LIGHTNESS);
    } catch {
        return parseColor(DEFAULT_COLOR_HEX).toFormat('hsl');
    }
};

export const getPastelHueFromHex = (hexColor: string, saturationPercent: number) => {
    return getPickerColorValue(hexColor, saturationPercent).getChannelValue('hue');
};

export const getPastelHexFromHue = (hueValue: number, saturationPercent: number) => {
    const normalizedHue = Math.max(0, Math.min(359.99, hueValue));
    const pastelColor = parseColor(`hsl(${normalizedHue}, ${saturationPercent}%, ${PASTEL_LIGHTNESS}%)`);

    return normalizeCharacterColorHex(pastelColor.toString('hex')) ?? DEFAULT_COLOR_HEX;
};

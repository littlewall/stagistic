import {
    clampCharacterColorSaturation,
    normalizeCharacterColorHex,
    normalizeCharacterKey,
} from '@stagistic/script-core';

const CHARACTER_COLOR_PALETTE = [
    '#E9C6A8',
    '#C9D8A2',
    '#A8D4C7',
    '#AFCDEA',
    '#C6B9E8',
    '#E2B9D6',
    '#F0D39B',
    '#C4D2C2',
] as const;

const hashCharacterToken = (token: string) => {
    if (token.length === 0) {
        return 0;
    }

    let hash = 0;

    for (let index = 0; index < token.length; index += 1) {
        hash = ((hash << 5) - hash + token.charCodeAt(index)) | 0;
    }

    return Math.abs(hash);
};

const toHashToken = (token: string) => hashCharacterToken(token).toString(36);

const hexToRgb = (hexColor: string) => {
    return {
        r: Number.parseInt(hexColor.slice(1, 3), 16),
        g: Number.parseInt(hexColor.slice(3, 5), 16),
        b: Number.parseInt(hexColor.slice(5, 7), 16),
    };
};

const rgbToHsl = ({
    r, g, b,
}: {
    r: number, g: number, b: number,
}) => {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const lightness = (max + min) / 2;

    if (delta === 0) {
        return {
            hue: 0,
            saturation: 0,
            lightness,
        };
    }

    const saturation = lightness > 0.5
        ? delta / (2 - max - min)
        : delta / (max + min);

    if (max === red) {
        return {
            hue: ((green - blue) / delta + (green < blue ? 6 : 0)) / 6,
            saturation,
            lightness,
        };
    }

    if (max === green) {
        return {
            hue: ((blue - red) / delta + 2) / 6,
            saturation,
            lightness,
        };
    }

    return {
        hue: ((red - green) / delta + 4) / 6,
        saturation,
        lightness,
    };
};

const hueToRgb = (p: number, q: number, t: number): number => {
    let normalized = t;

    if (normalized < 0) {
        normalized += 1;
    }

    if (normalized > 1) {
        normalized -= 1;
    }

    if (normalized < 1 / 6) {
        return p + (q - p) * 6 * normalized;
    }

    if (normalized < 1 / 2) {
        return q;
    }

    if (normalized < 2 / 3) {
        return p + (q - p) * (2 / 3 - normalized) * 6;
    }

    return p;
};

const hslToRgb = (
    hue: number,
    saturation: number,
    lightness: number,
) => {
    if (saturation === 0) {
        const channel = Math.round(lightness * 255);

        return {
            r: channel,
            g: channel,
            b: channel,
        };
    }

    const q = lightness < 0.5
        ? lightness * (1 + saturation)
        : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;

    return {
        r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
        g: Math.round(hueToRgb(p, q, hue) * 255),
        b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
    };
};

const toHexChannel = (value: number) => {
    return value
        .toString(16)
        .padStart(2, '0');
};

const applyCharacterColorSaturation = (hexColor: string, saturationPercent: number) => {
    const normalized = normalizeCharacterColorHex(hexColor);

    if (!normalized) {
        return hexColor;
    }

    const {hue, lightness} = rgbToHsl(hexToRgb(normalized));
    const nextSaturation = clampCharacterColorSaturation(saturationPercent) / 100;
    const nextRgb = hslToRgb(hue, nextSaturation, lightness);

    return `#${toHexChannel(nextRgb.r)}${toHexChannel(nextRgb.g)}${toHexChannel(nextRgb.b)}`.toUpperCase();
};

export {normalizeCharacterColorHex};

export const getCharacterColor = (characterKey: string, saturationPercent?: number) => {
    const colorIndex = hashCharacterToken(characterKey) % CHARACTER_COLOR_PALETTE.length;
    const baseColor = CHARACTER_COLOR_PALETTE[colorIndex] ?? CHARACTER_COLOR_PALETTE[0];

    if (saturationPercent === undefined) {
        return baseColor;
    }

    return applyCharacterColorSaturation(baseColor, saturationPercent);
};

export const getCharacterColorVarName = (characterKey: string) => {
    return `--character-color-key-${toHashToken(characterKey)}`;
};

export const getCharacterTagIdClassName = (characterId: string) => {
    return `ct-id-${toHashToken(characterId.trim())}`;
};

export const getCharacterTagKeyClassName = (characterKey: string) => {
    return `ct-key-${toHashToken(normalizeCharacterKey(characterKey))}`;
};

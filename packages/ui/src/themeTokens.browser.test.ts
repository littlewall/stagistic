import '../styles/base.css';

import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';

import {
    getContrastRatio,
    getRgb,
    readTokenColor,
    type Rgb,
} from './test/colorContrast';

const read = (name: string) => readTokenColor(name);

const PALETTE: ReadonlyArray<readonly [string, Rgb]> = [
    [
        '--palette-steel-wool', [
            91,
            98,
            103,
        ],
    ],
    [
        '--palette-creamed-corn', [
            247,
            224,
            159,
        ],
    ],
    [
        '--palette-primrose-yellow', [
            244,
            202,
            82,
        ],
    ],
    [
        '--palette-paper', [
            244,
            241,
            236,
        ],
    ],
];

afterEach(() => {
    document.body.innerHTML = '';
    delete document.documentElement.dataset.theme;
});

describe('brand palette', () => {
    it.each(PALETTE)('renders %s at its approved sRGB value', (name, rgb) => {
        expect(getRgb(read(name))).toEqual(rgb);
    });

    it('anchors the interface on the three Pantone colors', () => {
        expect(getRgb(read('--base-neutral'))).toEqual(getRgb(read('--palette-steel-wool')));
        expect(getRgb(read('--base-accent'))).toEqual(getRgb(read('--palette-primrose-yellow')));
        expect(getRgb(read('--base-selection'))).toEqual(getRgb(read('--palette-creamed-corn')));
    });
});

describe.each(['light', 'dark'] as const)('%s theme', theme => {
    it('keeps text, muted text, and the focus ring accessible', () => {
        document.documentElement.dataset.theme = theme;

        expect(getContrastRatio(
            read('--color-text'),
            read('--color-surface-paper'),
        )).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(
            read('--color-text-muted'),
            read('--color-surface'),
        )).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(
            read('--color-focus-ring'),
            read('--color-surface'),
        )).toBeGreaterThanOrEqual(3);
    });

    it('keeps selection, accent, and hover visually distinct', () => {
        document.documentElement.dataset.theme = theme;

        expect(read('--state-selected')).not.toBe(read('--state-hover'));
        expect(read('--state-selected')).not.toBe(read('--color-accent'));
        expect(read('--color-focus-ring')).not.toBe(read('--color-accent'));
    });
});

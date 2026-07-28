import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {VisualLine} from '../visualLine';
import {
    composeLeadingPages,
    composeRenderedLeadingPages,
} from './composeLeadingPages';

const page = (label: string): VisualLine[] => [
    {
        y: 100,
        runs: [
            {
                text: label,
                x: 100,
                fontSizePx: 16,
                bold: false,
                italic: false,
                underline: false,
                fontFamily: 'Courier Prime',
            },
        ],
    },
];

const pageText = (lines: VisualLine[]) => lines.flatMap(line => line.runs.map(run => run.text));
const initialPage = (
    label: string,
    characterCount = 1,
) => ({
    kind: 'characters-and-places' as const,
    characters: Array.from({length: characterCount}, (_value, index) => ({
        id: `${label}-${index}`,
        displayName: `${label} ${index}`,
        outline: null,
    })),
    places: [],
    showCharacterOutlines: false,
});

describe('composeRenderedLeadingPages', () => {
    it.each([
        {
            initialCount: 0,
            manualCount: 0,
            expectedCount: 1,
            expectedRoman: [],
        },
        {
            initialCount: 0,
            manualCount: 1,
            expectedCount: 1,
            expectedRoman: [],
        },
        {
            initialCount: 0,
            manualCount: 2,
            expectedCount: 3,
            expectedRoman: [],
        },
        {
            initialCount: 1,
            manualCount: 0,
            expectedCount: 1,
            expectedRoman: ['i'],
        },
        {
            initialCount: 1,
            manualCount: 1,
            expectedCount: 3,
            expectedRoman: [
                'i',
                'ii',
                'iii',
            ],
        },
        {
            initialCount: 2,
            manualCount: 0,
            expectedCount: 3,
            expectedRoman: [
                'i',
                'ii',
                'iii',
            ],
        },
        {
            initialCount: 2,
            manualCount: 1,
            expectedCount: 3,
            expectedRoman: [
                'i',
                'ii',
                'iii',
            ],
        },
    ])(
        'composes $initialCount initial and $manualCount manual pages',
        ({
            initialCount,
            manualCount,
            expectedCount,
            expectedRoman,
        }) => {
            const pages = composeRenderedLeadingPages(
                Array.from({length: initialCount}, (_value, index) => page(`initial-${index}`)),
                manualCount,
                true,
                DEFAULT_EDITOR_SETTINGS,
            );
            const roman = pages
                .flatMap(pageText)
                .filter(text => (/^[ivxlcdm]+$/u).test(text));

            expect(pages).toHaveLength(expectedCount);
            expect(pages.length % 2).toBe(1);
            expect(roman).toEqual(expectedRoman);
        },
    );

    it('hides Roman labels without changing physical pages', () => {
        const numbered = composeRenderedLeadingPages(
            [page('initial')],
            1,
            true,
            DEFAULT_EDITOR_SETTINGS,
        );
        const hidden = composeRenderedLeadingPages(
            [page('initial')],
            1,
            false,
            DEFAULT_EDITOR_SETTINGS,
        );

        expect(hidden).toHaveLength(numbered.length);
        expect(hidden.flatMap(pageText)).not.toContain('i');
    });
});

describe('composeLeadingPages', () => {
    it('starts each initial page type on an odd physical page', () => {
        const pages = composeLeadingPages(
            {
                initialPages: [initialPage('First'), initialPage('Second')],
                manualBlankCount: 0,
                showRomanPageNumbers: true,
                startEachInitialPageOnOddPage: true,
            },
            DEFAULT_EDITOR_SETTINGS,
        );

        expect(pages.map(pageText)).toEqual([
            [],
            [
                'CHARACTERS',
                'First 0',
                'i',
            ],
            ['ii'],
            [
                'CHARACTERS',
                'Second 0',
                'iii',
            ],
            ['iv'],
        ]);
    });

    it('keeps overflow pages together before placing the next type', () => {
        const settings = {
            ...DEFAULT_EDITOR_SETTINGS,
            page: {
                ...DEFAULT_EDITOR_SETTINGS.page,
                widthPx: 360,
                heightPx: 260,
                marginTopPx: 24,
                marginRightPx: 32,
                marginBottomPx: 24,
                marginLeftPx: 32,
            },
            typography: {
                fontSizePx: 12,
                lineHeight: 1.2,
            },
        };
        const pages = composeLeadingPages(
            {
                initialPages: [initialPage('Overflow', 10), initialPage('Next')],
                manualBlankCount: 0,
                showRomanPageNumbers: true,
                startEachInitialPageOnOddPage: true,
            },
            settings,
        );

        expect(pageText(pages[0])).toEqual([]);
        expect(pageText(pages[1])).toContain('Overflow 0');
        expect(pageText(pages[2])).toContain('Overflow 9');
        expect(pageText(pages[3])).toContain('Next 0');
        expect(pageText(pages[4])).toEqual(['iv']);
    });
});

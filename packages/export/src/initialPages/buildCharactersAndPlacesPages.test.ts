import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {CharactersAndPlacesInitialPagePlan} from '../plan';
import type {VisualLine} from '../visualLine';
import {buildCharactersAndPlacesPages} from './buildCharactersAndPlacesPages';

const textOf = (line: VisualLine) => line.runs.map(run => run.text).join('');
const findLine = (lines: VisualLine[], text: string) => {
    const line = lines.find(item => textOf(item) === text);

    expect(line).toBeDefined();

    return line!;
};

const centeredX = (text: string, fontSizePx: number, pageWidthPx: number) => (pageWidthPx - text.length * fontSizePx * 0.6) / 2;

const basePlan = (
    patch: Partial<CharactersAndPlacesInitialPagePlan> = {},
): CharactersAndPlacesInitialPagePlan => ({
    kind: 'characters-and-places',
    characters: [
        {
            id: 'anna', displayName: 'Anna', outline: 'A brave lead',
        }, {
            id: 'bob', displayName: 'Bob', outline: 'A careful friend',
        },
    ],
    places: [{id: 'attic', name: 'Attic'}, {id: 'stage', name: 'Stage'}],
    showCharacterOutlines: true,
    ...patch,
});

describe('buildCharactersAndPlacesPages', () => {
    it('centers headings, characters, outlines, and places', () => {
        const [page] = buildCharactersAndPlacesPages(
            basePlan(),
            DEFAULT_EDITOR_SETTINGS,
        );
        const heading = findLine(page, 'CHARACTERS');
        const anna = findLine(page, 'Anna');
        const outline = findLine(page, 'A brave lead');
        const bob = findLine(page, 'Bob');
        const placesHeading = findLine(page, 'PLACES');
        const bodySize = DEFAULT_EDITOR_SETTINGS.typography.fontSizePx;
        const lineHeight = bodySize * DEFAULT_EDITOR_SETTINGS.typography.lineHeight;

        expect(heading.runs[0]).toMatchObject({
            bold: true,
            fontSizePx: bodySize * 1.1,
            x: centeredX('CHARACTERS', bodySize * 1.1, DEFAULT_EDITOR_SETTINGS.page.widthPx),
        });
        expect(anna.runs[0]?.x).toBe(centeredX(
            'Anna',
            bodySize,
            DEFAULT_EDITOR_SETTINGS.page.widthPx,
        ));
        expect(outline.runs[0]).toMatchObject({
            italic: true,
            x: centeredX(
                'A brave lead',
                bodySize,
                DEFAULT_EDITOR_SETTINGS.page.widthPx,
            ),
        });
        expect(outline.y - anna.y).toBeCloseTo(lineHeight * 1.35);
        expect(bob.y - outline.y).toBeCloseTo(lineHeight * 2);
        expect(placesHeading.y - findLine(page, 'A careful friend').y).toBeGreaterThan(
            lineHeight * 3,
        );
        expect(placesHeading.runs[0]?.bold).toBe(true);
        expect(textOf(page.at(-1)!)).toBe('Stage');
    });

    it('gives character names extra line height without outlines', () => {
        const [page] = buildCharactersAndPlacesPages(
            basePlan({showCharacterOutlines: false}),
            DEFAULT_EDITOR_SETTINGS,
        );
        const anna = findLine(page, 'Anna');
        const bob = findLine(page, 'Bob');
        const lineHeight = DEFAULT_EDITOR_SETTINGS.typography.fontSizePx
            * DEFAULT_EDITOR_SETTINGS.typography.lineHeight;

        expect(bob.y - anna.y).toBeCloseTo(lineHeight * 1.35);
    });

    it('repeats Characters on overflow and places Places after the final character', () => {
        const settings = {
            ...DEFAULT_EDITOR_SETTINGS,
            page: {
                ...DEFAULT_EDITOR_SETTINGS.page,
                widthPx: 360,
                heightPx: 210,
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
        const characters = Array.from({length: 14}, (_value, index) => ({
            id: `character-${index}`,
            displayName: `Character ${index}`,
            outline: null,
        }));
        const pages = buildCharactersAndPlacesPages(
            basePlan({
                characters,
                showCharacterOutlines: false,
            }),
            settings,
        );
        const allText = pages.flatMap(page => page.map(textOf));
        const finalCharacterIndex = allText.indexOf('Character 13');
        const placesIndex = allText.indexOf('PLACES');

        expect(pages.length).toBeGreaterThan(1);
        pages.forEach(page => {
            expect(textOf(page[0])).toBe('CHARACTERS');
        });
        characters.forEach(character => {
            expect(allText.filter(text => text === character.displayName)).toHaveLength(1);
        });
        expect(placesIndex).toBeGreaterThan(finalCharacterIndex);
        pages.flat().forEach(line => {
            expect(line.y).toBeLessThan(
                settings.page.heightPx - settings.page.marginBottomPx,
            );
        });
    });

    it('omits Places when the plan has no places', () => {
        const pages = buildCharactersAndPlacesPages(
            basePlan({places: []}),
            DEFAULT_EDITOR_SETTINGS,
        );

        expect(pages.flatMap(page => page.map(textOf))).not.toContain('PLACES');
    });
});

import type {EditorSettings} from '@stagistic/script';

import type {CharactersAndPlacesInitialPagePlan} from '../plan';
import type {
    VisualLine,
    VisualRun,
} from '../visualLine';
import {balanceTextLines} from './balanceTextLines';

export type VisualPage = VisualLine[];

const MONO_FONT_FAMILY = 'Courier Prime';
const CHAR_WIDTH_EM = 0.6;
const HEADING_FONT_SCALE = 1.1;
const CHARACTER_NAME_LINE_HEIGHT_SCALE = 1.35;
const SECTION_GAP_LINE_COUNT = 2;
const CHARACTERS_HEADING = 'CHARACTERS';
const PLACES_HEADING = 'PLACES';

interface Geometry {
    pageWidthPx: number,
    contentWidthPx: number,
    contentTopPx: number,
    contentBottomPx: number,
    bodyFontSizePx: number,
    bodyLineHeightPx: number,
    headingFontSizePx: number,
    headingLineHeightPx: number,
}

interface PageCursor {
    pages: VisualPage[],
    current: VisualPage,
    y: number,
}

const makeRun = (
    text: string,
    x: number,
    fontSizePx: number,
    emphasis: {bold?: boolean, italic?: boolean} = {},
): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: emphasis.bold ?? false,
    italic: emphasis.italic ?? false,
    underline: false,
    fontFamily: MONO_FONT_FAMILY,
});

const centeredLine = (
    geometry: Geometry,
    text: string,
    y: number,
    fontSizePx = geometry.bodyFontSizePx,
    emphasis: {bold?: boolean, italic?: boolean} = {},
): VisualLine => ({
    y,
    runs: [
        makeRun(
            text,
            (geometry.pageWidthPx - text.length * fontSizePx * CHAR_WIDTH_EM) / 2,
            fontSizePx,
            emphasis,
        ),
    ],
});

const createGeometry = (settings: EditorSettings): Geometry => {
    const bodyFontSizePx = settings.typography.fontSizePx;
    const headingFontSizePx = bodyFontSizePx * HEADING_FONT_SCALE;

    return {
        pageWidthPx: settings.page.widthPx,
        contentWidthPx: settings.page.widthPx
            - settings.page.marginLeftPx
            - settings.page.marginRightPx,
        contentTopPx: settings.page.marginTopPx,
        contentBottomPx: settings.page.heightPx - settings.page.marginBottomPx,
        bodyFontSizePx,
        bodyLineHeightPx: bodyFontSizePx * settings.typography.lineHeight,
        headingFontSizePx,
        headingLineHeightPx: headingFontSizePx * settings.typography.lineHeight,
    };
};

const startPage = (
    cursor: PageCursor,
    geometry: Geometry,
) => {
    const page = [
        centeredLine(
            geometry,
            CHARACTERS_HEADING,
            geometry.contentTopPx,
            geometry.headingFontSizePx,
            {bold: true},
        ),
    ];

    cursor.pages.push(page);
    cursor.current = page;
    cursor.y = geometry.contentTopPx
        + geometry.headingLineHeightPx
        + geometry.bodyLineHeightPx;
};

const hasBodyContent = (cursor: PageCursor) => cursor.current.length > 1;

const ensureSpace = (
    cursor: PageCursor,
    geometry: Geometry,
    heightPx: number,
) => {
    if (cursor.y + heightPx <= geometry.contentBottomPx) {
        return;
    }

    if (hasBodyContent(cursor)) {
        startPage(cursor, geometry);
    }
};

const pushBodyLine = (
    cursor: PageCursor,
    geometry: Geometry,
    text: string,
    emphasis: {bold?: boolean, italic?: boolean} = {},
    advancePx = geometry.bodyLineHeightPx,
) => {
    if (cursor.y + geometry.bodyLineHeightPx > geometry.contentBottomPx) {
        startPage(cursor, geometry);
    }

    cursor.current.push(centeredLine(
        geometry,
        text,
        cursor.y,
        geometry.bodyFontSizePx,
        emphasis,
    ));
    cursor.y += advancePx;
};

const pushCharacter = (
    cursor: PageCursor,
    geometry: Geometry,
    character: CharactersAndPlacesInitialPagePlan['characters'][number],
    showOutline: boolean,
) => {
    const maxChars = Math.max(
        1,
        Math.floor(geometry.contentWidthPx / (geometry.bodyFontSizePx * CHAR_WIDTH_EM)),
    );
    const characterNameLineHeightPx = geometry.bodyLineHeightPx
        * CHARACTER_NAME_LINE_HEIGHT_SCALE;
    const outlineLines = showOutline && character.outline
        ? balanceTextLines(character.outline, maxChars)
        : [];
    const groupHeightPx = characterNameLineHeightPx
        + outlineLines.length * geometry.bodyLineHeightPx
        + (showOutline ? geometry.bodyLineHeightPx : 0);

    ensureSpace(
        cursor,
        geometry,
        groupHeightPx,
    );
    pushBodyLine(
        cursor,
        geometry,
        character.displayName,
        {},
        characterNameLineHeightPx,
    );
    outlineLines.forEach(line => {
        pushBodyLine(cursor, geometry, line, {italic: true});
    });

    if (showOutline) {
        cursor.y += geometry.bodyLineHeightPx;
    }
};

const pushPlaces = (
    cursor: PageCursor,
    geometry: Geometry,
    places: CharactersAndPlacesInitialPagePlan['places'],
) => {
    if (places.length === 0) {
        return;
    }

    const gapPx = geometry.bodyLineHeightPx * SECTION_GAP_LINE_COUNT;
    const firstGroupHeight = gapPx
        + geometry.headingLineHeightPx
        + geometry.bodyLineHeightPx * 2;

    ensureSpace(cursor, geometry, firstGroupHeight);
    cursor.y += gapPx;
    cursor.current.push(centeredLine(
        geometry,
        PLACES_HEADING,
        cursor.y,
        geometry.headingFontSizePx,
        {bold: true},
    ));
    cursor.y += geometry.headingLineHeightPx + geometry.bodyLineHeightPx;
    places.forEach(place => {
        pushBodyLine(cursor, geometry, place.name);
    });
};

export const buildCharactersAndPlacesPages = (
    plan: CharactersAndPlacesInitialPagePlan,
    settings: EditorSettings,
): VisualPage[] => {
    const geometry = createGeometry(settings);
    const cursor: PageCursor = {
        pages: [],
        current: [],
        y: geometry.contentTopPx,
    };

    startPage(cursor, geometry);
    plan.characters.forEach(character => {
        pushCharacter(
            cursor,
            geometry,
            character,
            plan.showCharacterOutlines,
        );
    });
    pushPlaces(cursor, geometry, plan.places);

    return cursor.pages;
};

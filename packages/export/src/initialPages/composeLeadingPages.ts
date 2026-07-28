import type {EditorSettings} from '@stagistic/script';

import type {LeadingPagesPlan} from '../plan';
import type {
    VisualLine,
    VisualRun,
} from '../visualLine';
import {
    type VisualPage,
} from './buildCharactersAndPlacesPages';
import {buildInitialPagePages} from './buildInitialPagePages';
import {toLowerRoman} from './romanNumerals';

const MONO_FONT_FAMILY = 'Courier Prime';
const CHAR_WIDTH_EM = 0.6;

export const needsBalancingBlank = (leadingPageCount: number) => leadingPageCount % 2 === 0;

interface RenderedInitialPages {
    pages: VisualPage[],
    romanNumberStartIndex: number,
}

const buildRomanFooter = (
    number: number,
    settings: EditorSettings,
): VisualLine => {
    const text = toLowerRoman(number);
    const fontSizePx = settings.typography.fontSizePx;
    const lineHeightPx = fontSizePx * settings.typography.lineHeight;
    const x = (settings.page.widthPx
        - text.length * fontSizePx * CHAR_WIDTH_EM) / 2;
    const y = settings.page.heightPx
        - settings.page.marginBottomPx
        + Math.max(
            0,
            (settings.page.marginBottomPx - lineHeightPx) / 2,
        );
    const run: VisualRun = {
        text,
        x,
        fontSizePx,
        bold: false,
        italic: false,
        underline: false,
        fontFamily: MONO_FONT_FAMILY,
    };

    return {y, runs: [run]};
};

export const composeRenderedLeadingPages = (
    renderedInitialPages: VisualPage[],
    manualBlankCount: number,
    showRomanPageNumbers: boolean,
    settings: EditorSettings,
    romanNumberStartIndex = 0,
): VisualPage[] => {
    const hasInitialPages = renderedInitialPages.length > 0;
    const blankCount = Math.max(0, Math.floor(manualBlankCount));
    const pages = [...renderedInitialPages.map(page => [...page]), ...Array.from({length: blankCount}, () => [] as VisualPage)];

    if (needsBalancingBlank(pages.length)) {
        pages.push([]);
    }

    if (!hasInitialPages || !showRomanPageNumbers) {
        return pages;
    }

    return pages.map((page, index) => {
        if (index < romanNumberStartIndex) {
            return page;
        }

        return [...page, buildRomanFooter(index - romanNumberStartIndex + 1, settings)];
    });
};

const renderInitialPages = (
    plan: LeadingPagesPlan,
    settings: EditorSettings,
): RenderedInitialPages => {
    const groups = plan.initialPages
        .map(initialPage => buildInitialPagePages(initialPage, settings))
        .filter(group => group.length > 0);

    if (groups.length === 0) {
        return {
            pages: [],
            romanNumberStartIndex: 0,
        };
    }

    if (!plan.startEachInitialPageOnOddPage) {
        return {
            pages: groups.flat(),
            romanNumberStartIndex: 0,
        };
    }

    const pages: VisualPage[] = [[]];

    groups.forEach(group => {
        if (needsBalancingBlank(pages.length)) {
            pages.push([]);
        }

        pages.push(...group);
    });

    return {
        pages,
        romanNumberStartIndex: 1,
    };
};

export const willAddAutomaticBalancingBlank = (
    plan: LeadingPagesPlan,
    settings: EditorSettings,
) => {
    const {pages} = renderInitialPages(plan, settings);
    const manualBlankCount = Math.max(
        0,
        Math.floor(plan.manualBlankCount),
    );

    return needsBalancingBlank(pages.length + manualBlankCount);
};

export const composeLeadingPages = (
    plan: LeadingPagesPlan,
    settings: EditorSettings,
): VisualPage[] => {
    const {
        pages,
        romanNumberStartIndex,
    } = renderInitialPages(plan, settings);

    return composeRenderedLeadingPages(
        pages,
        plan.manualBlankCount,
        plan.showRomanPageNumbers,
        settings,
        romanNumberStartIndex,
    );
};

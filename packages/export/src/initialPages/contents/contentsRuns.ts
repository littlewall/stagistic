import type {
    VisualLine,
    VisualRun,
} from '../../visualLine';
import {
    type ContentsGeometry,
    MONO_FONT_FAMILY,
    SCORE_COLUMN_HEADER,
    SCRIPT_COLUMN_HEADER,
} from './contentsGeometry';

export const makeRun = (
    text: string,
    x: number,
    fontSizePx: number,
    emphasis: {
        bold?: boolean,
        italic?: boolean,
        underline?: boolean,
    } = {},
): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: emphasis.bold ?? false,
    italic: emphasis.italic ?? false,
    underline: emphasis.underline ?? false,
    fontFamily: MONO_FONT_FAMILY,
});

export const centeredRun = (
    geometry: ContentsGeometry,
    text: string,
    fontSizePx: number,
    emphasis: {bold?: boolean} = {},
) => makeRun(
    text,
    (geometry.pageWidthPx - text.length * fontSizePx * 0.6) / 2,
    fontSizePx,
    emphasis,
);

export const rightAlignedRun = (
    text: string,
    rightPx: number,
    fontSizePx: number,
    charWidthPx: number,
    emphasis: {underline?: boolean} = {},
) => makeRun(text, rightPx - text.length * charWidthPx, fontSizePx, emphasis);

export const numberRuns = (
    geometry: ContentsGeometry,
    scriptPage: number | null,
    scorePage: number | null,
): VisualRun[] => {
    const runs: VisualRun[] = [];

    if (scriptPage !== null) {
        runs.push(rightAlignedRun(
            String(scriptPage),
            geometry.scriptRightPx,
            geometry.bodyFontSizePx,
            geometry.bodyCharWidthPx,
        ));
    }

    if (scorePage !== null && geometry.scoreRightPx !== null) {
        runs.push(rightAlignedRun(
            String(scorePage),
            geometry.scoreRightPx,
            geometry.bodyFontSizePx,
            geometry.bodyCharWidthPx,
        ));
    }

    return runs;
};

export const columnHeaderLine = (
    geometry: ContentsGeometry,
    y: number,
): VisualLine => {
    const runs = [
        rightAlignedRun(
            SCRIPT_COLUMN_HEADER,
            geometry.scriptRightPx,
            geometry.smallFontSizePx,
            geometry.smallCharWidthPx,
            {underline: true},
        ),
    ];

    if (geometry.scoreRightPx !== null) {
        runs.push(rightAlignedRun(
            SCORE_COLUMN_HEADER,
            geometry.scoreRightPx,
            geometry.smallFontSizePx,
            geometry.smallCharWidthPx,
            {underline: true},
        ));
    }

    return {y, runs};
};

export const wrapToWidth = (value: string, maxChars: number): string[] => {
    if (maxChars < 1) {
        return [value];
    }

    const lines: string[] = [];
    let current = '';

    value.split(/\s+/u).filter(word => word.length > 0).forEach(word => {
        const candidate = current.length === 0 ? word : `${current} ${word}`;

        if (candidate.length <= maxChars) {
            current = candidate;

            return;
        }

        if (current.length > 0) {
            lines.push(current);
        }

        current = word;
    });

    if (current.length > 0) {
        lines.push(current);
    }

    return lines.length > 0 ? lines : [''];
};

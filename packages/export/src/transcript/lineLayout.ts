import {type EditorSettings} from '@stagistic/script';

import type {VisualRun} from '../model/visualLine';
import {type InlineStyle, MONO_FONT_FAMILY} from './model';

export const makeRun = (
    text: string,
    x: number,
    block: NonNullable<EditorSettings['blocks'][string]>,
    fontSizePx: number,
    style: InlineStyle = {},
): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: (block.isBold ?? false) || (style.bold ?? false),
    italic: (block.isItalic ?? false) || (style.italic ?? false),
    underline: style.noUnderline === true ? false : (block.isUnderline ?? false) || (style.underline ?? false),
    fontFamily: MONO_FONT_FAMILY,
});

export const resolveLineX = ({
    block,
    line,
    baseX,
    availableWidthPx,
    charWidthPx,
}: {
    block: NonNullable<EditorSettings['blocks'][string]>,
    line: string,
    baseX: number,
    availableWidthPx: number,
    charWidthPx: number,
}) => {
    const textWidthPx = line.length * charWidthPx;

    if (block.textAlign === 'center') {
        return baseX + Math.max(0, (availableWidthPx - textWidthPx) / 2);
    }

    if (block.textAlign === 'right') {
        return baseX + Math.max(0, availableWidthPx - textWidthPx);
    }

    return baseX;
};

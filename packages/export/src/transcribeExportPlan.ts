import {
    collectCueAtoms,
    CUE_ID_ATTR,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
    type CueBlockInput,
    deriveCues,
    type EditorSettings,
    formatCueNumber,
    formatOutLabel,
    getScriptBlockId,
    getScriptBlockNodeType,
    hasNodeChildren,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

import type {ExportPlan, ForcedBreak} from './plan';
import type {
    PageItem,
    TranscriptResult,
    VisualLine,
    VisualRun,
} from './visualLine';

const PAGE_BREAK_ITEM: PageItem = {type: '__page_break__'};
const MONO_FONT_FAMILY = 'Courier Prime';
const DEFAULT_BLOCK_TYPE = 'stageDirection';
const CHAR_WIDTH_EM = 0.6;

type LayoutCursor = {
    pageNumber: number,
    y: number,
    items: PageItem[],
};

const getNodeText = (node: ScriptNode): string => {
    const ownText = typeof node.text === 'string' ? node.text : '';
    const childText = hasNodeChildren(node)
        ? node.content.map(getNodeText).join('')
        : '';

    return `${ownText}${childText}`;
};

interface CueLabels {
    numberByCueId: Map<string, string>,
    outLabelByBlockId: Map<string, string>,
}

const readAttrString = (
    attrs: Record<string, unknown> | undefined,
    key: string,
): string => {
    const value = attrs?.[key];

    return typeof value === 'string' ? value : '';
};

/**
 * Cue atoms carry no inline text: their visible label (scene-scoped number +
 * title) is derived globally, exactly as the editor's cue-numbering plugin does,
 * so the transcript reserves the same vertical space the editor shows.
 */
const buildCueLabels = (doc: ScriptDocument): CueLabels => {
    const inputs: CueBlockInput[] = doc.content.map(node => ({
        blockId: getScriptBlockId(node) ?? '',
        blockType: getScriptBlockNodeType(node, DEFAULT_BLOCK_TYPE),
        cueAtoms: collectCueAtoms(node),
    }));
    const numberByCueId = new Map<string, string>();
    const outLabelByBlockId = new Map<string, string>();

    deriveCues(inputs).forEach(cue => {
        numberByCueId.set(cue.cueId, formatCueNumber(cue));

        if (cue.mode === 'open' && cue.endBlockId) {
            outLabelByBlockId.set(cue.endBlockId, formatOutLabel(cue));
        }
    });

    return {numberByCueId, outLabelByBlockId};
};

const getBlockRawText = (
    node: ScriptNode,
    blockId: string,
    cues: CueLabels,
): string => {
    if (!hasNodeChildren(node)) {
        return getNodeText(node);
    }

    return node.content.map(child => {
        if (child.type === CUE_START_NODE_NAME) {
            const number = cues.numberByCueId.get(readAttrString(child.attrs, CUE_ID_ATTR)) ?? '';
            const title = readAttrString(child.attrs, CUE_TITLE_ATTR).trim();

            return ` ${title.length > 0 ? `${number} ${title}` : number} `;
        }

        if (child.type === CUE_OUT_NODE_NAME) {
            return ` ${cues.outLabelByBlockId.get(blockId) ?? 'out'} `;
        }

        return getNodeText(child);
    }).join('');
};

const applyCasing = (
    text: string,
    casing: string | undefined,
) => {
    if (casing === 'uppercase') {
        return text.toLocaleUpperCase();
    }

    if (casing === 'lowercase') {
        return text.toLocaleLowerCase();
    }

    return text;
};

const normalizeBlockText = (
    rawText: string,
    blockType: string,
    casing: string | undefined,
) => {
    const collapsed = rawText.replace(/\s+/gu, ' ').trim();
    const cased = applyCasing(collapsed, casing);

    if (blockType === 'aside' && cased.length > 0) {
        return `(${cased})`;
    }

    return cased;
};

const wrapText = (
    text: string,
    maxChars: number,
) => {
    if (text.length === 0) {
        return [''];
    }

    const words = text.split(/\s+/u);
    const lines: string[] = [];
    let line = '';

    words.forEach(word => {
        if (line.length === 0) {
            line = word;

            return;
        }

        if (`${line} ${word}`.length <= maxChars) {
            line = `${line} ${word}`;

            return;
        }

        lines.push(line);
        line = word;
    });

    if (line.length > 0) {
        lines.push(line);
    }

    return lines.flatMap(item => {
        if (item.length <= maxChars) {
            return [item];
        }

        const chunks: string[] = [];

        for (let index = 0; index < item.length; index += maxChars) {
            chunks.push(item.slice(index, index + maxChars));
        }

        return chunks;
    });
};

const pushPageBreak = (cursor: LayoutCursor, marginTopPx: number) => {
    if (cursor.items.at(-1) !== PAGE_BREAK_ITEM) {
        cursor.items.push(PAGE_BREAK_ITEM);
    }

    cursor.pageNumber += 1;
    cursor.y = marginTopPx;
};

const ensureLineFits = (
    cursor: LayoutCursor,
    settings: EditorSettings,
    lineHeightPx: number,
) => {
    const pageBottom = settings.page.heightPx - settings.page.marginBottomPx;

    if (cursor.y + lineHeightPx <= pageBottom || cursor.items.length === 0) {
        return;
    }

    pushPageBreak(cursor, settings.page.marginTopPx);
};

const applyForcedBreak = (
    cursor: LayoutCursor,
    settings: EditorSettings,
    forcedBreak: ForcedBreak | undefined,
) => {
    if (!forcedBreak || cursor.items.length === 0) {
        return;
    }

    pushPageBreak(cursor, settings.page.marginTopPx);

    if (forcedBreak.kind !== 'odd-page') {
        return;
    }

    if (cursor.pageNumber % 2 === 0) {
        pushPageBreak(cursor, settings.page.marginTopPx);
    }
};

const makeRun = (
    text: string,
    x: number,
    block: NonNullable<EditorSettings['blocks'][string]>,
    fontSizePx: number,
): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: block.isBold ?? false,
    italic: block.isItalic ?? false,
    underline: block.isUnderline ?? false,
    fontFamily: MONO_FONT_FAMILY,
});

const resolveLineX = ({
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

export const transcribeExportPlan = (
    plan: ExportPlan,
    settings: EditorSettings,
): TranscriptResult => {
    const forcedBreakByBlockId = new Map(plan.pagination.forcedBreaks.map(item => [item.blockId, item]));
    const cursor: LayoutCursor = {
        pageNumber: 1,
        y: settings.page.marginTopPx,
        items: [],
    };
    const contentWidthPx = settings.page.widthPx - settings.page.marginLeftPx - settings.page.marginRightPx;
    const cueLabels = buildCueLabels(plan.doc);

    plan.doc.content.forEach(node => {
        const blockType = getScriptBlockNodeType(node, DEFAULT_BLOCK_TYPE);
        const block = settings.blocks[blockType] ?? settings.blocks[DEFAULT_BLOCK_TYPE] ?? {};
        const blockId = getScriptBlockId(node);
        const fontSizePx = block.fontSizePx ?? settings.typography.fontSizePx;
        const lineHeightPx = fontSizePx * (block.lineHeight ?? settings.typography.lineHeight);
        const charWidthPx = fontSizePx * CHAR_WIDTH_EM;
        const indentLeftPx = typeof block.indentLeftChars === 'number'
            ? block.indentLeftChars * charWidthPx
            : block.indentLeftPx ?? 0;
        const indentRightPx = typeof block.indentRightChars === 'number'
            ? block.indentRightChars * charWidthPx
            : block.indentRightPx ?? 0;
        const availableWidthPx = Math.max(charWidthPx, contentWidthPx - indentLeftPx - indentRightPx);
        const maxChars = Math.max(1, Math.floor(availableWidthPx / charWidthPx));
        const baseX = settings.page.marginLeftPx + indentLeftPx;
        const rawText = getBlockRawText(node, blockId ?? '', cueLabels);
        const text = normalizeBlockText(rawText, blockType, block.casing);
        const lines = wrapText(text, maxChars);

        applyForcedBreak(cursor, settings, blockId ? forcedBreakByBlockId.get(blockId) : undefined);

        cursor.y += (block.spacingBeforeEm ?? 0) * fontSizePx;

        lines.forEach(line => {
            ensureLineFits(cursor, settings, lineHeightPx);

            const visualLine: VisualLine = {
                y: cursor.y,
                runs: [
                    makeRun(line, resolveLineX({
                        block,
                        line,
                        baseX,
                        availableWidthPx,
                        charWidthPx,
                    }), block, fontSizePx),
                ],
            };

            cursor.items.push(visualLine);
            cursor.y += lineHeightPx;
        });

        cursor.y += (block.spacingAfterEm ?? 0) * fontSizePx;
    });

    return {
        pageWidthPx: settings.page.widthPx,
        pageHeightPx: settings.page.heightPx,
        marginLeftPx: settings.page.marginLeftPx,
        marginTopPx: settings.page.marginTopPx,
        items: cursor.items,
    };
};

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
import {
    FIT_EPSILON_PX,
    isOrphanCandidateBlockType,
    isSplittableBlockType,
    MIN_SPLIT_LINES_AFTER,
    MIN_SPLIT_LINES_BEFORE,
    paginate,
    type PaginatorBlock,
} from '@stagistic/script-pagination';

import type {ExportPlan} from './plan';
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

interface PreparedBlock {
    blockType: string,
    block: NonNullable<EditorSettings['blocks'][string]>,
    fontSizePx: number,
    lineHeightPx: number,
    spacingBeforePx: number,
    spacingAfterPx: number,
    baseX: number,
    availableWidthPx: number,
    charWidthPx: number,
    wrapped: string[],
}

export const transcribeExportPlan = (
    plan: ExportPlan,
    settings: EditorSettings,
): TranscriptResult => {
    const forcedBreakByBlockId = new Map(plan.pagination.forcedBreaks.map(item => [item.blockId, item]));
    const contentWidthPx = settings.page.widthPx - settings.page.marginLeftPx - settings.page.marginRightPx;
    const cueLabels = buildCueLabels(plan.doc);

    const prepared: PreparedBlock[] = plan.doc.content.map(node => {
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
        const rawText = getBlockRawText(node, blockId ?? '', cueLabels);
        const text = normalizeBlockText(rawText, blockType, block.casing);

        return {
            blockType,
            block,
            fontSizePx,
            lineHeightPx,
            spacingBeforePx: (block.spacingBeforeEm ?? 0) * fontSizePx,
            spacingAfterPx: (block.spacingAfterEm ?? 0) * fontSizePx,
            baseX: settings.page.marginLeftPx + indentLeftPx,
            availableWidthPx,
            charWidthPx,
            wrapped: wrapText(text, maxChars),
        };
    });

    const paginatorBlocks: PaginatorBlock[] = prepared.map((item, index) => {
        const blockId = getScriptBlockId(plan.doc.content[index]) ?? '';
        const forcedBreak = forcedBreakByBlockId.get(blockId)?.kind;
        const height = item.spacingBeforePx + item.wrapped.length * item.lineHeightPx + item.spacingAfterPx;
        const key = String(index);

        return {
            key,
            endKey: key,
            height,
            splittable: isSplittableBlockType(item.blockType),
            orphanCandidate: isOrphanCandidateBlockType(item.blockType),
            forcedBreak,
            getLineMap: () => ({
                lines: item.wrapped.map((_line, lineIndex) => ({
                    startPos: lineIndex,
                    topRel: item.spacingBeforePx + lineIndex * item.lineHeightPx,
                })),
                cleanHeight: height,
            }),
        };
    });

    const layout = paginate(paginatorBlocks, {
        contentHeight: settings.page.heightPx - settings.page.marginTopPx - settings.page.marginBottomPx,
        topSpacing: settings.page.marginTopPx,
        bottomSpacing: settings.page.marginBottomPx,
        orphanThreshold: 2 * settings.typography.fontSizePx * settings.typography.lineHeight,
        minLinesBefore: MIN_SPLIT_LINES_BEFORE,
        minLinesAfter: MIN_SPLIT_LINES_AFTER,
        epsilonPx: FIT_EPSILON_PX,
    });

    const wholeBreaksBefore = new Map<string, number>();
    const splitsByKey = new Map<string, number[]>();

    layout.breaks.forEach(item => {
        if (item.isInlineBreak && item.breakPos !== null) {
            const positions = splitsByKey.get(item.atBlockKey) ?? [];

            positions.push(item.breakPos);
            splitsByKey.set(item.atBlockKey, positions);

            return;
        }

        wholeBreaksBefore.set(item.atBlockKey, (wholeBreaksBefore.get(item.atBlockKey) ?? 0) + 1);
    });

    const items: PageItem[] = [];
    let y = settings.page.marginTopPx;

    const pushBreak = () => {
        /*
         * Collapse consecutive breaks (mirrors the previous cursor behaviour):
         * an odd-page blank page advances numbering without an empty PDF page.
         */
        if (items.at(-1) !== PAGE_BREAK_ITEM) {
            items.push(PAGE_BREAK_ITEM);
        }

        y = settings.page.marginTopPx;
    };

    prepared.forEach((item, index) => {
        const key = String(index);
        const wholeBreaks = wholeBreaksBefore.get(key) ?? 0;

        for (let breakCount = 0; breakCount < wholeBreaks; breakCount += 1) {
            pushBreak();
        }

        y += item.spacingBeforePx;

        const splits = (splitsByKey.get(key) ?? []).sort((left, right) => left - right);
        let splitIndex = 0;

        item.wrapped.forEach((line, lineIndex) => {
            if (splitIndex < splits.length && splits[splitIndex] === lineIndex) {
                pushBreak();
                splitIndex += 1;
            }

            const visualLine: VisualLine = {
                y,
                runs: [
                    makeRun(line, resolveLineX({
                        block: item.block,
                        line,
                        baseX: item.baseX,
                        availableWidthPx: item.availableWidthPx,
                        charWidthPx: item.charWidthPx,
                    }), item.block, item.fontSizePx),
                ],
            };

            items.push(visualLine);
            y += item.lineHeightPx;
        });

        y += item.spacingAfterPx;
    });

    return {
        pageWidthPx: settings.page.widthPx,
        pageHeightPx: settings.page.heightPx,
        marginLeftPx: settings.page.marginLeftPx,
        marginTopPx: settings.page.marginTopPx,
        items,
    };
};

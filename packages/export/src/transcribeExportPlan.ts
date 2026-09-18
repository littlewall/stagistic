import {
    buildPageMark,
    CHARACTER_TAG_MARK_NAME,
    collectMusicAtoms,
    DEFAULT_SCENE_NUMBER_FORMAT,
    deriveMusic,
    type EditorSettings,
    formatMusicNumber,
    formatSceneNumber,
    getScriptBlockId,
    getScriptBlockNodeType,
    hasNodeChildren,
    type HeaderFooterAlignment,
    type HeaderFooterCellSettings,
    type HeaderFooterRowSettings,
    MUSIC_ID_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type MusicBlockInput,
    resolveDraftDate,
    resolveHeaderFooterText,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';
import {
    FIT_EPSILON_PX,
    isOrphanCandidateBlockType,
    isSplittableBlockType,
    MIN_SPLIT_LINES_AFTER,
    MIN_SPLIT_LINES_BEFORE,
    type PageBreak,
    paginate,
    type PaginatorBlock,
} from '@stagistic/script-pagination';

import {composeLeadingPages} from './initialPages/composeLeadingPages';
import type {ContentsPageNumbers} from './initialPages/contents/contentsPageNumbers';
import {planIntegratedAssembly} from './pdf/planIntegratedAssembly';
import type {ExportPlan} from './plan';
import {buildTitlePageItems} from './titlePage/buildTitlePageItems';
import type {PageItem, TranscriptResult, VisualLine, VisualRun} from './visualLine';

const PAGE_BREAK_ITEM: PageItem = {type: '__page_break__'};
const MONO_FONT_FAMILY = 'Courier Prime';
const DEFAULT_BLOCK_TYPE = 'stageDirection';
const CHAR_WIDTH_EM = 0.6;
const HEADER_FOOTER_MAX_WIDTH_RATIO = 0.4;
const HEADER_FOOTER_ALIGNMENTS: HeaderFooterAlignment[] = ['left', 'center', 'right'];

const getNodeText = (node: ScriptNode): string => {
    const ownText = typeof node.text === 'string' ? node.text : '';
    const childText = hasNodeChildren(node) ? node.content.map(getNodeText).join('') : '';

    return `${ownText}${childText}`;
};

interface MusicLabels {
    numberByMusicId: Map<string, string>;
}

interface InlineStyle {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    characterTag?: boolean;
    // Forces underline off regardless of the block's underline setting, so the
    // scene-number label stays un-underlined like the editor's `::before` marker.
    noUnderline?: boolean;
}

interface TextSegment {
    text: string;
    style: InlineStyle;
}

interface WrappedLine {
    text: string;
    segments: TextSegment[];
}

interface TextWord {
    segments: TextSegment[];
    spaceStyle: InlineStyle;
}

const readAttrString = (attrs: Record<string, unknown> | undefined, key: string): string => {
    const value = attrs?.[key];

    return typeof value === 'string' ? value : '';
};

/**
 * Music atoms carry no inline text: their visible label (scene-scoped number +
 * title) is derived globally, exactly as the editor's music-numbering plugin does,
 * so the transcript reserves the same vertical space the editor shows.
 */
const buildMusicLabels = (doc: ScriptDocument): MusicLabels => {
    const inputs: MusicBlockInput[] = doc.content.map(node => ({
        blockId: getScriptBlockId(node) ?? '',
        blockType: getScriptBlockNodeType(node, DEFAULT_BLOCK_TYPE),
        musicAtoms: collectMusicAtoms(node),
    }));
    const numberByMusicId = new Map<string, string>();

    deriveMusic(inputs).forEach(music => {
        numberByMusicId.set(music.musicId, formatMusicNumber(music));
    });

    return {numberByMusicId};
};

const markStyle = (node: ScriptNode): InlineStyle => ({
    bold: node.marks?.some(mark => mark.type === 'bold') ?? false,
    italic: node.marks?.some(mark => mark.type === 'italic') ?? false,
    underline: node.marks?.some(mark => mark.type === 'underline') ?? false,
});

const hasCharacterTagMark = (node: ScriptNode): boolean => {
    return node.marks?.some(mark => mark.type === CHARACTER_TAG_MARK_NAME) ?? false;
};

const pushSegment = (segments: TextSegment[], text: string, style: InlineStyle = {}) => {
    if (text.length === 0) {
        return;
    }

    const previous = segments[segments.length - 1];

    if (
        previous &&
        Boolean(previous.style.bold) === Boolean(style.bold) &&
        Boolean(previous.style.italic) === Boolean(style.italic) &&
        Boolean(previous.style.underline) === Boolean(style.underline) &&
        Boolean(previous.style.noUnderline) === Boolean(style.noUnderline) &&
        Boolean(previous.style.characterTag) === Boolean(style.characterTag)
    ) {
        previous.text = `${previous.text}${text}`;

        return;
    }

    segments.push({text, style});
};

const getBlockRawSegments = (node: ScriptNode, _blockId: string, music: MusicLabels): TextSegment[] => {
    if (!hasNodeChildren(node)) {
        return [{text: getNodeText(node), style: {...markStyle(node), characterTag: hasCharacterTagMark(node)}}];
    }

    const segments: TextSegment[] = [];

    node.content.forEach(child => {
        if (child.type === MUSIC_START_NODE_NAME) {
            const number = music.numberByMusicId.get(readAttrString(child.attrs, MUSIC_ID_ATTR)) ?? '';
            const title = readAttrString(child.attrs, MUSIC_TITLE_ATTR).trim();

            pushSegment(segments, ` ${title.length > 0 ? `${number} ${title}` : number} `, {bold: true});

            return;
        }

        if (child.type === MUSIC_OUT_NODE_NAME) {
            return;
        }

        pushSegment(segments, getNodeText(child), {...markStyle(child), characterTag: hasCharacterTagMark(child)});
    });

    return segments;
};

const applyCasing = (text: string, casing: string | undefined) => {
    if (casing === 'uppercase') {
        return text.toLocaleUpperCase();
    }

    if (casing === 'lowercase') {
        return text.toLocaleLowerCase();
    }

    return text;
};

const normalizeBlockSegments = (rawSegments: TextSegment[], blockType: string, casing: string | undefined) => {
    const segments: TextSegment[] = [];
    let pendingSpace = false;

    rawSegments.forEach(segment => {
        const isCharacterTag = blockType === 'stageDirection' && segment.style.characterTag === true;
        const casedText = isCharacterTag ? segment.text.toLocaleUpperCase() : applyCasing(segment.text, casing);

        Array.from(casedText).forEach(character => {
            if (/\s/u.test(character)) {
                pendingSpace = segments.length > 0;

                return;
            }

            if (pendingSpace) {
                pushSegment(segments, ' ', segment.style);
                pendingSpace = false;
            }

            pushSegment(segments, character, segment.style);
        });
    });

    if (blockType === 'aside' && segments.length > 0) {
        pushSegment(segments, ')', segments.at(-1)?.style);
        segments.unshift({text: '(', style: segments[0].style});
    }

    return segments;
};

const splitLongWord = (word: TextSegment[], maxChars: number): TextSegment[][] => {
    const chunks: TextSegment[][] = [];
    let chunk: TextSegment[] = [];
    let chunkLength = 0;

    word.forEach(segment => {
        Array.from(segment.text).forEach(character => {
            if (chunkLength === maxChars) {
                chunks.push(chunk);
                chunk = [];
                chunkLength = 0;
            }

            pushSegment(chunk, character, segment.style);
            chunkLength += 1;
        });
    });

    if (chunk.length > 0) {
        chunks.push(chunk);
    }

    return chunks;
};

const lineText = (segments: TextSegment[]): string => segments.map(segment => segment.text).join('');

const toWrappedLine = (segments: TextSegment[]): WrappedLine => ({
    text: lineText(segments),
    segments,
});

const splitWords = (segments: TextSegment[]): TextWord[] => {
    const words: TextWord[] = [];
    let current: TextSegment[] = [];
    let pendingSpaceStyle: InlineStyle = {};

    segments.forEach(segment => {
        Array.from(segment.text).forEach(character => {
            if (character === ' ') {
                if (current.length > 0) {
                    words.push({segments: current, spaceStyle: pendingSpaceStyle});
                    current = [];
                }

                pendingSpaceStyle = segment.style;

                return;
            }

            pushSegment(current, character, segment.style);
        });
    });

    if (current.length > 0) {
        words.push({segments: current, spaceStyle: pendingSpaceStyle});
    }

    return words;
};

const wrapSegments = (segments: TextSegment[], maxChars: number) => {
    if (segments.length === 0) {
        return [toWrappedLine([])];
    }

    const lines: WrappedLine[] = [];
    let current: TextSegment[] = [];
    let currentLength = 0;

    splitWords(segments).forEach(word => {
        const wordLength = lineText(word.segments).length;

        if (wordLength > maxChars) {
            if (current.length > 0) {
                lines.push(toWrappedLine(current));
                current = [];
                currentLength = 0;
            }

            splitLongWord(word.segments, maxChars).forEach(chunk => {
                lines.push(toWrappedLine(chunk));
            });

            return;
        }

        if (current.length === 0) {
            current = [...word.segments];
            currentLength = wordLength;

            return;
        }

        if (currentLength + 1 + wordLength <= maxChars) {
            pushSegment(current, ' ', word.spaceStyle);
            word.segments.forEach(segment => pushSegment(current, segment.text, segment.style));
            currentLength += 1 + wordLength;

            return;
        }

        lines.push(toWrappedLine(current));
        current = [...word.segments];
        currentLength = wordLength;
    });

    if (current.length > 0) {
        lines.push(toWrappedLine(current));
    }

    return lines;
};

const makeRun = (text: string, x: number, block: NonNullable<EditorSettings['blocks'][string]>, fontSizePx: number, style: InlineStyle = {}): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: (block.isBold ?? false) || (style.bold ?? false),
    italic: (block.isItalic ?? false) || (style.italic ?? false),
    underline: style.noUnderline === true ? false : (block.isUnderline ?? false) || (style.underline ?? false),
    fontFamily: MONO_FONT_FAMILY,
});

const resolveLineX = ({
    block,
    line,
    baseX,
    availableWidthPx,
    charWidthPx,
}: {
    block: NonNullable<EditorSettings['blocks'][string]>;
    line: string;
    baseX: number;
    availableWidthPx: number;
    charWidthPx: number;
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
    blockType: string;
    block: NonNullable<EditorSettings['blocks'][string]>;
    fontSizePx: number;
    lineHeightPx: number;
    spacingBeforePx: number;
    spacingAfterPx: number;
    baseX: number;
    availableWidthPx: number;
    charWidthPx: number;
    wrapped: WrappedLine[];
}

interface PageStructureMark {
    actIndex: number | null;
    sceneNumber: number;
}

interface ScriptPage {
    items: VisualLine[];
    mark: PageStructureMark | null;
    isInsertedBlank: boolean;
    sourceBlockIds: Set<string>;
    referencePageNumber?: number;
    referencePageMarkNumber?: number;
}

const buildStructureMarks = (doc: ScriptDocument): PageStructureMark[] => {
    let actIndex = 0;
    let sceneNumber = 0;

    return doc.content.map(node => {
        const blockType = getScriptBlockNodeType(node, DEFAULT_BLOCK_TYPE);

        if (blockType === 'act') {
            actIndex += 1;
        }

        if (blockType === 'scene') {
            sceneNumber += 1;
        }

        return {
            actIndex: actIndex > 0 ? actIndex : null,
            sceneNumber,
        };
    });
};

const makeHeaderFooterRun = (text: string, x: number, cell: HeaderFooterCellSettings, fontSizePx: number): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: cell.isBold,
    italic: cell.isItalic,
    underline: cell.isUnderline,
    fontFamily: MONO_FONT_FAMILY,
});

const resolveHeaderFooterX = ({
    alignment,
    text,
    settings,
    fontSizePx,
}: {
    alignment: HeaderFooterAlignment;
    text: string;
    settings: EditorSettings;
    fontSizePx: number;
}) => {
    const charWidthPx = fontSizePx * CHAR_WIDTH_EM;
    const textWidthPx = text.length * charWidthPx;
    const contentWidthPx = settings.page.widthPx - settings.page.marginLeftPx - settings.page.marginRightPx;
    const maxWidthPx = contentWidthPx * HEADER_FOOTER_MAX_WIDTH_RATIO;
    const clampedWidthPx = Math.min(textWidthPx, maxWidthPx);

    if (alignment === 'center') {
        return settings.page.marginLeftPx + (contentWidthPx - clampedWidthPx) / 2;
    }

    if (alignment === 'right') {
        return settings.page.widthPx - settings.page.marginRightPx - clampedWidthPx;
    }

    return settings.page.marginLeftPx;
};

const shouldRenderInsertedBlankCell = (area: 'header' | 'footer', cell: HeaderFooterCellSettings): boolean => {
    return area === 'footer' && cell.text.includes('{{page_number}}');
};

const buildHeaderFooterLine = ({
    area,
    row,
    y,
    page,
    pageNumber,
    pageMarkNumber,
    draftDate,
    plan,
    settings,
}: {
    area: 'header' | 'footer';
    row: HeaderFooterRowSettings;
    y: number;
    page: ScriptPage;
    pageNumber: number;
    pageMarkNumber: number;
    draftDate: string;
    plan: ExportPlan;
    settings: EditorSettings;
}): VisualLine | null => {
    const mark = page.mark ?? {actIndex: null, sceneNumber: 0};
    const pageMark = page.isInsertedBlank
        ? ''
        : buildPageMark({
              actIndex: mark.actIndex,
              sceneNumber: mark.sceneNumber,
              pageNumber: pageMarkNumber,
          });
    const runs = HEADER_FOOTER_ALIGNMENTS.flatMap(alignment => {
        const cell = row[alignment];

        if (page.isInsertedBlank && !shouldRenderInsertedBlankCell(area, cell)) {
            return [];
        }

        const text = resolveHeaderFooterText(cell.text, {
            scriptTitle: plan.scriptTitle,
            draftDate,
            pageMark,
            pageNumber,
        });

        if (text.length === 0) {
            return [];
        }

        const fontSizePx = settings.typography.fontSizePx;
        const x = resolveHeaderFooterX({
            alignment,
            text,
            settings,
            fontSizePx,
        });

        return [makeHeaderFooterRun(text, x, cell, fontSizePx)];
    });

    return runs.length > 0 ? {y, runs} : null;
};

const withHeaderFooter = (pages: ScriptPage[], plan: ExportPlan, settings: EditorSettings): PageItem[] => {
    const fontSizePx = settings.typography.fontSizePx;
    const lineHeightPx = fontSizePx * settings.typography.lineHeight;
    const headerY = Math.max(0, (settings.page.marginTopPx - lineHeightPx) / 2);
    const footerY = settings.page.heightPx - settings.page.marginBottomPx + Math.max(0, (settings.page.marginBottomPx - lineHeightPx) / 2);
    const draftDate = plan.titlePage ? resolveDraftDate(plan.titlePage) : '';
    let pageMarkNumber = 0;

    return pages.flatMap((page, index) => {
        const pageNumber = page.referencePageNumber ?? index + 1;

        if (!page.isInsertedBlank) {
            pageMarkNumber += 1;
        }

        const header = buildHeaderFooterLine({
            area: 'header',
            row: settings.headerFooter.header,
            y: headerY,
            page,
            pageNumber,
            pageMarkNumber: page.referencePageMarkNumber ?? pageMarkNumber,
            draftDate,
            plan,
            settings,
        });
        const footer = buildHeaderFooterLine({
            area: 'footer',
            row: settings.headerFooter.footer,
            y: footerY,
            page,
            pageNumber,
            pageMarkNumber: page.referencePageMarkNumber ?? pageMarkNumber,
            draftDate,
            plan,
            settings,
        });
        const pageItems: PageItem[] = [...(header ? [header] : []), ...page.items, ...(footer ? [footer] : [])];

        return index === pages.length - 1 ? pageItems : [...pageItems, PAGE_BREAK_ITEM];
    });
};

const getIntegratedFooter = (plan: ExportPlan, settings: EditorSettings) => {
    if (plan.postSteps.length === 0) {
        return undefined;
    }

    const fontSizePx = settings.typography.fontSizePx;
    const lineHeightPx = fontSizePx * settings.typography.lineHeight;
    const yPx = settings.page.heightPx - settings.page.marginBottomPx + Math.max(0, (settings.page.marginBottomPx - lineHeightPx) / 2);

    return HEADER_FOOTER_ALIGNMENTS.flatMap(alignment => {
        const cell = settings.headerFooter.footer[alignment];

        if (!cell.text.includes('{{page_number}}')) {
            return [];
        }

        return [
            {
                alignment,
                text: cell.text,
                yPx,
                fontSizePx,
                bold: cell.isBold,
                italic: cell.isItalic,
                underline: cell.isUnderline,
            },
        ];
    })[0];
};

export interface TranscribeOptions {
    /** Page count of each attached score PDF, keyed by music id. */
    scorePageCounts?: Record<string, number>;
}

export const transcribeExportPlan = (plan: ExportPlan, settings: EditorSettings, options: TranscribeOptions = {}): TranscriptResult => {
    const forcedBreakByBlockId = new Map(plan.pagination.forcedBreaks.map(item => [item.blockId, item]));
    const contentWidthPx = settings.page.widthPx - settings.page.marginLeftPx - settings.page.marginRightPx;
    const musicLabels = buildMusicLabels(plan.doc);
    const structureMarks = buildStructureMarks(plan.doc);

    const prepared: PreparedBlock[] = plan.doc.content.map((node, index) => {
        const blockType = getScriptBlockNodeType(node, DEFAULT_BLOCK_TYPE);
        const block = settings.blocks[blockType] ?? settings.blocks[DEFAULT_BLOCK_TYPE] ?? {};
        const blockId = getScriptBlockId(node);
        const fontSizePx = block.fontSizePx ?? settings.typography.fontSizePx;
        const lineHeightPx = fontSizePx * (block.lineHeight ?? settings.typography.lineHeight);
        const charWidthPx = fontSizePx * CHAR_WIDTH_EM;
        const indentLeftPx = typeof block.indentLeftChars === 'number' ? block.indentLeftChars * charWidthPx : (block.indentLeftPx ?? 0);
        const indentRightPx = typeof block.indentRightChars === 'number' ? block.indentRightChars * charWidthPx : (block.indentRightPx ?? 0);
        const availableWidthPx = Math.max(charWidthPx, contentWidthPx - indentLeftPx - indentRightPx);
        const maxChars = Math.max(1, Math.floor(availableWidthPx / charWidthPx));
        const rawSegments = getBlockRawSegments(node, blockId ?? '', musicLabels);
        const segments = normalizeBlockSegments(rawSegments, blockType, block.casing);

        if (blockType === 'scene') {
            const label = formatSceneNumber(structureMarks[index]?.sceneNumber ?? 0, block.sceneNumberFormat ?? DEFAULT_SCENE_NUMBER_FORMAT);

            if (label.length > 0) {
                segments.unshift({text: `${label} `, style: {noUnderline: true}});
            }
        }

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
            wrapped: wrapSegments(segments, maxChars),
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

    const wholeBreaksBefore = new Map<string, PageBreak['kind'][]>();
    const splitsByKey = new Map<string, number[]>();

    layout.breaks.forEach(item => {
        if (item.isInlineBreak && item.breakPos !== null) {
            const positions = splitsByKey.get(item.atBlockKey) ?? [];

            positions.push(item.breakPos);
            splitsByKey.set(item.atBlockKey, positions);

            return;
        }

        const breaks = wholeBreaksBefore.get(item.atBlockKey) ?? [];

        wholeBreaksBefore.set(item.atBlockKey, [...breaks, item.kind]);
    });

    const pages: ScriptPage[] = [
        {
            items: [],
            mark: null,
            isInsertedBlank: false,
            sourceBlockIds: new Set(),
        },
    ];
    let currentPage = pages[0];
    let y = settings.page.marginTopPx;

    const pushBreak = (kind: PageBreak['kind']) => {
        if (kind === 'oddBlank') {
            currentPage.isInsertedBlank = true;
        }

        currentPage = {
            items: [],
            mark: null,
            isInsertedBlank: false,
            sourceBlockIds: new Set(),
        };
        pages.push(currentPage);
        y = settings.page.marginTopPx;
    };

    prepared.forEach((item, index) => {
        const key = String(index);
        const wholeBreaks = wholeBreaksBefore.get(key) ?? [];

        wholeBreaks.forEach(pushBreak);

        y += item.spacingBeforePx;

        const splits = (splitsByKey.get(key) ?? []).sort((left, right) => left - right);
        let splitIndex = 0;

        item.wrapped.forEach((line, lineIndex) => {
            if (splitIndex < splits.length && splits[splitIndex] === lineIndex) {
                pushBreak('split');
                splitIndex += 1;
            }

            const lineX = resolveLineX({
                block: item.block,
                line: line.text,
                baseX: item.baseX,
                availableWidthPx: item.availableWidthPx,
                charWidthPx: item.charWidthPx,
            });
            let runX = lineX;
            const visualLine: VisualLine = {
                y,
                runs: line.segments.map(segment => {
                    const run = makeRun(segment.text, runX, item.block, item.fontSizePx, segment.style);

                    runX += segment.text.length * item.charWidthPx;

                    return run;
                }),
                sourceBlockId: getScriptBlockId(plan.doc.content[index]) ?? undefined,
            };

            currentPage.mark ??= structureMarks[index] ?? {actIndex: null, sceneNumber: 0};
            currentPage.items.push(visualLine);
            if (visualLine.sourceBlockId) {
                currentPage.sourceBlockIds.add(visualLine.sourceBlockId);
            }

            y += item.lineHeightPx;
        });

        y += item.spacingAfterPx;
    });

    /*
     * The title page is always page 1, followed by any blank pages, then the
     * script. Everything is one flat item stream: N page breaks after the title
     * = the title→next boundary plus (count − 1) blank-page boundaries.
     */
    const allScriptPages = pages.filter(page => page.items.length > 0 || page.isInsertedBlank);
    let referencePageMarkNumber = 0;

    allScriptPages.forEach((page, index) => {
        if (!page.isInsertedBlank) {
            referencePageMarkNumber += 1;
        }

        page.referencePageNumber = index + 1;
        page.referencePageMarkNumber = referencePageMarkNumber;
    });

    const visibleBlockIds = plan.visibleBlockIds ? new Set(plan.visibleBlockIds) : null;
    const scriptPages = visibleBlockIds
        ? allScriptPages
              .map(page => ({
                  ...page,
                  items: page.items.filter(line => !line.sourceBlockId || visibleBlockIds.has(line.sourceBlockId)),
              }))
              .filter(page => page.items.length > 0 || page.isInsertedBlank)
        : allScriptPages;
    const scriptItems = withHeaderFooter(scriptPages, plan, settings);
    const titleItems = buildTitlePageItems(plan.titlePage, plan.scriptTitle, settings);
    const scriptPageSourceBlockIds = scriptPages.map(page => [...page.sourceBlockIds]);
    const scriptPageNumberByBlockId = new Map<string, number>();

    scriptPages.forEach((page, index) => {
        const pageNumber = page.referencePageNumber ?? index + 1;

        page.sourceBlockIds.forEach(blockId => {
            if (!scriptPageNumberByBlockId.has(blockId)) {
                scriptPageNumberByBlockId.set(blockId, pageNumber);
            }
        });
    });

    const scoreStartPageByMusicId = options.scorePageCounts
        ? planIntegratedAssembly({
              scriptPageSourceBlockIds,
              scores: plan.postSteps.map(step => ({
                  musicId: step.musicId,
                  startBlockId: step.startBlockId,
                  afterBlockId: step.afterBlockId,
                  pageCount: options.scorePageCounts?.[step.musicId] ?? 0,
              })),
          }).scoreStartPageByMusicId
        : new Map<string, number>();
    const pageNumbers: ContentsPageNumbers = {
        scriptPageNumberByBlockId,
        scoreStartPageByMusicId,
    };
    const leadingPages = composeLeadingPages(plan.leadingPages, settings, pageNumbers);
    const leadingItems: PageItem[] = [titleItems, ...leadingPages].flatMap(page => [...page, PAGE_BREAK_ITEM]);

    return {
        pageWidthPx: settings.page.widthPx,
        pageHeightPx: settings.page.heightPx,
        marginLeftPx: settings.page.marginLeftPx,
        marginRightPx: settings.page.marginRightPx,
        marginTopPx: settings.page.marginTopPx,
        items: [...leadingItems, ...scriptItems],
        leadingPageCount: [titleItems, ...leadingPages].length,
        scriptPageSourceBlockIds,
        integratedScores: plan.postSteps.map(step => ({
            musicId: step.musicId,
            title: step.title,
            startBlockId: step.startBlockId,
            afterBlockId: step.afterBlockId,
        })),
        integratedFooter: getIntegratedFooter(plan, settings),
    };
};

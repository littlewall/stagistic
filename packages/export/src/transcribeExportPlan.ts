import {DEFAULT_SCENE_NUMBER_FORMAT, type EditorSettings, formatSceneNumber, getScriptBlockId, getScriptBlockNodeType} from '@stagistic/script';
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
import {buildTitlePageLogoItem} from './titlePage/buildTitlePageLogoItem';
import {getIntegratedFooter, withHeaderFooter} from './transcript/headerFooter';
import {makeRun, resolveLineX} from './transcript/lineLayout';
import {CHAR_WIDTH_EM, DEFAULT_BLOCK_TYPE, PAGE_BREAK_ITEM, type PreparedBlock, type ScriptPage} from './transcript/model';
import {buildStructureMarks} from './transcript/structureMarks';
import {buildMusicLabels, getBlockRawSegments, normalizeBlockSegments} from './transcript/textSegments';
import {wrapSegments} from './transcript/wrapSegments';
import type {PageItem, TranscriptResult, VisualLine} from './visualLine';

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
    const titlePageLogo = buildTitlePageLogoItem(plan.titlePage, settings);
    const titleItems: PageItem[] = [...(titlePageLogo ? [titlePageLogo] : []), ...buildTitlePageItems(plan.titlePage, plan.scriptTitle, settings)];
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

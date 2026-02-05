import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
} from '@stagistic/editor-core';
import type {EditorSettings} from '@stagistic/shared';
import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
    type EditorView,
} from '@tiptap/pm/view';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
} from '../fountainCore';

type PageInfo = {
    index: number,
    startPos: number,
    endPos: number,
    startOffset: number,
    endOffset: number,
};

type PaginationState = {
    pageCount: number,
    pages: PageInfo[],
    pageHeight: number,
    contentHeight: number,
    lineHeightPx: number,
    marginTop: number,
    marginBottom: number,
    marginLeft: number,
    marginRight: number,
};

type PaginationPluginState = {
    decorations: DecorationSet,
    pagination: PaginationState,
};

export type PaginationOptions = {
    pageHeight: number,
    pageWidth: number,
    marginTop: number,
    marginBottom: number,
    marginLeft: number,
    marginRight: number,
    lineHeightPx: number,
    dividerColor: string,
    dividerThickness: number,
};

type PaginationStorage = {
    optionsVersion: number,
    state: PaginationState,
};

type BlockCacheEntry = {
    node: ProseMirrorNode,
    height: number,
    isFallback: boolean,
    hasInlineBreaks: boolean,
};

const paginationKey = new PluginKey<PaginationPluginState>('fountain-pagination');

const SPLITTABLE_BLOCK_TYPES = new Set([
    ELEMENT_ACTION,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
]);

const MORE_CONTD_BLOCK_TYPES = new Set([
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
]);

const ORPHAN_PUSHDOWN_TYPES = new Set([
    ELEMENT_CHARACTER,
    ELEMENT_SCENE_HEADING,
    'fountain_section',
]);

const DEFAULT_OPTIONS: PaginationOptions = {
    pageHeight: 1123,
    pageWidth: 794,
    marginTop: 95,
    marginBottom: 95,
    marginLeft: 76,
    marginRight: 76,
    lineHeightPx: 22,
    dividerColor: 'var(--color-divider)',
    dividerThickness: 1,
};

type SpacerOverlay = {
    moreText?: string,
    contdText?: string,
};

const createSpacerElement = (
    height: number,
    options: PaginationOptions,
    dividerOffset?: number,
    overlay?: SpacerOverlay,
    isInlineBreak = false,
): HTMLElement => {
    const spacer = document.createElement(isInlineBreak ? 'span' : 'div');

    spacer.dataset.paginationSpacer = 'true';
    if (isInlineBreak) {
        spacer.dataset.paginationInlineBreak = 'true';
    }

    spacer.contentEditable = 'false';
    spacer.style.position = 'relative';
    spacer.style.height = `${Math.max(0, height)}px`;
    spacer.style.pointerEvents = 'none';
    if (isInlineBreak) {
        spacer.style.display = 'inline-block';
        spacer.style.width = '100%';
    }

    if (dividerOffset !== undefined) {
        const divider = document.createElement('div');

        divider.dataset.paginationDivider = 'true';
        divider.style.position = 'absolute';
        divider.style.left = `${-options.marginLeft}px`;
        divider.style.top = `${Math.max(0, dividerOffset)}px`;
        divider.style.width = `calc(100% + ${options.marginLeft + options.marginRight}px)`;
        divider.style.borderTop = `${Math.max(1, options.dividerThickness)}px solid ${options.dividerColor}`;
        divider.style.pointerEvents = 'none';

        spacer.appendChild(divider);
    }

    const bottomSpacing = Math.max(0, dividerOffset ?? 0);
    const topSpacing = Math.max(0, height - bottomSpacing);
    const lineHeight = Math.max(1, options.lineHeightPx);
    const textGap = Math.max(2, Math.round(lineHeight * 0.25));
    const moreTop = Math.min(Math.max(0, bottomSpacing - lineHeight), textGap);
    const contdTop = Math.max(
        bottomSpacing,
        bottomSpacing + topSpacing - lineHeight - textGap,
    );

    if (overlay?.moreText) {
        const moreEl = document.createElement('div');

        moreEl.dataset.paginationOverlay = 'more';
        moreEl.textContent = overlay.moreText;
        moreEl.style.position = 'absolute';
        moreEl.style.right = '0';
        moreEl.style.top = `${moreTop}px`;
        moreEl.style.fontFamily = 'inherit';
        moreEl.style.fontSize = '0.9em';
        moreEl.style.lineHeight = `${options.lineHeightPx}px`;
        moreEl.style.letterSpacing = '0.02em';
        moreEl.style.textTransform = 'uppercase';
        moreEl.style.color = 'var(--color-ink-muted)';
        moreEl.style.opacity = '0.75';
        moreEl.style.userSelect = 'none';

        spacer.appendChild(moreEl);
    }

    if (overlay?.contdText) {
        const contdEl = document.createElement('div');

        contdEl.dataset.paginationOverlay = 'contd';
        contdEl.textContent = overlay.contdText;
        contdEl.style.position = 'absolute';
        contdEl.style.left = 'var(--editor-character-indent, 56px)';
        contdEl.style.top = `${contdTop}px`;
        contdEl.style.fontFamily = 'inherit';
        contdEl.style.fontSize = '0.9em';
        contdEl.style.lineHeight = `${options.lineHeightPx}px`;
        contdEl.style.letterSpacing = '0.02em';
        contdEl.style.textTransform = 'uppercase';
        contdEl.style.color = 'var(--color-ink-muted)';
        contdEl.style.opacity = '0.75';
        contdEl.style.userSelect = 'none';

        spacer.appendChild(contdEl);
    }

    return spacer;
};

const getBlockKey = (node: ProseMirrorNode, pos: number) => {
    const attrs = node.attrs as Record<string, unknown>;
    const id = typeof attrs.id === 'string' ? attrs.id : null;

    return id ? `id:${id}` : `pos:${pos}`;
};

const measureBlockHeight = (
    view: EditorView,
    pos: number,
    fallbackHeight: number,
    domOverride?: HTMLElement | null,
): {
    height: number, isFallback: boolean, hasInlineBreaks: boolean,
} => {
    const dom = domOverride ?? (view.nodeDOM(pos) as HTMLElement | null);

    if (!dom) {
        return {
            height: fallbackHeight, isFallback: true, hasInlineBreaks: false,
        };
    }

    let height = dom.offsetHeight;

    const inlineBreaks = dom.querySelectorAll('[data-pagination-inline-break]');
    const hasInlineBreaks = inlineBreaks.length > 0;

    if (hasInlineBreaks) {
        let inlineBreakHeight = 0;

        for (let i = 0; i < inlineBreaks.length; i += 1) {
            const inlineBreak = inlineBreaks[i] as HTMLElement;

            inlineBreakHeight += inlineBreak.offsetHeight || 0;
        }

        height = Math.max(0, height - inlineBreakHeight);
    }

    if (height > 0) {
        return {
            height, isFallback: false, hasInlineBreaks,
        };
    }

    return {
        height: fallbackHeight, isFallback: true, hasInlineBreaks,
    };
};

const resolveBreakPos = (
    view: EditorView,
    blockPos: number,
    blockNode: ProseMirrorNode,
    blockDom: HTMLElement,
    breakY: number,
): number => {
    const editorRect = view.dom.getBoundingClientRect();
    const blockRect = blockDom.getBoundingClientRect();
    const minY = blockRect.top + 1;
    const maxY = blockRect.bottom - 1;
    const viewportY = Math.min(Math.max(editorRect.top + breakY, minY), maxY);
    const viewportX = Math.min(blockRect.left + 8, blockRect.right - 2);
    const coords = view.posAtCoords({left: viewportX, top: viewportY});

    if (!coords) {
        return Math.min(blockPos + blockNode.nodeSize - 1, blockPos + 1);
    }

    const minPos = blockPos + 1;
    const maxPos = blockPos + blockNode.nodeSize - 1;

    const rawPos = Math.min(Math.max(coords.pos, minPos), maxPos);

    return resolveWordBoundaryPos(blockNode, blockPos, rawPos);
};

const resolveWordBoundaryPos = (
    blockNode: ProseMirrorNode,
    blockPos: number,
    breakPos: number,
): number => {
    const blockStart = blockPos + 1;
    const blockEnd = blockPos + blockNode.nodeSize - 1;
    const isWhitespace = (value: string) => (/\s/).test(value);
    let nearestBefore: number | null = null;
    let nearestAfter: number | null = null;

    blockNode.nodesBetween(0, blockNode.content.size, (node, pos) => {
        if (!node.isText) {
            return true;
        }

        const text = node.text ?? '';

        for (let i = 0; i < text.length; i += 1) {
            if (!isWhitespace(text[i])) {
                continue;
            }

            const boundaryPos = blockStart + pos + i + 1;

            if (boundaryPos <= breakPos) {
                if (nearestBefore === null || boundaryPos > nearestBefore) {
                    nearestBefore = boundaryPos;
                }
            } else if (nearestAfter === null || boundaryPos < nearestAfter) {
                nearestAfter = boundaryPos;
            }
        }

        return true;
    });

    const candidate = nearestBefore ?? nearestAfter;

    if (candidate === null) {
        return breakPos;
    }

    return Math.min(Math.max(candidate, blockStart), blockEnd);
};

const buildPaginationState = (
    view: EditorView,
    options: PaginationOptions,
    cache: Map<string, BlockCacheEntry>,
): {
    decorations: DecorationSet,
    pagination: PaginationState,
    nextCache: Map<string, BlockCacheEntry>,
    hasInlineBreaks: boolean,
    usedFallbackMeasurements: boolean,
} => {
    const decorations: Decoration[] = [];
    const pages: PageInfo[] = [];
    const nextCache = new Map<string, BlockCacheEntry>();
    let hasInlineBreaks = false;
    let usedFallbackMeasurements = false;

    const topSpacing = Math.max(0, options.marginTop);
    const bottomSpacing = Math.max(0, options.marginBottom);
    const contentHeight = Math.max(0, options.pageHeight - topSpacing - bottomSpacing);
    const fallbackHeight = Math.max(0, options.lineHeightPx);
    const orphanThreshold = Math.max(0, options.lineHeightPx * 2);

    let currentHeight = 0;
    let pageIndex = 0;
    let pageStartPos: number | null = null;
    let pageStartOffset = 0;
    let offsetCursor = 0;
    let lastBlockEndPos: number | null = null;
    let lastCharacterName: string | null = null;

    if (contentHeight <= 0) {
        return {
            decorations: DecorationSet.empty,
            pagination: {
                pageCount: 1,
                pages: [],
                pageHeight: options.pageHeight,
                contentHeight,
                lineHeightPx: fallbackHeight,
                marginTop: options.marginTop,
                marginBottom: options.marginBottom,
                marginLeft: options.marginLeft,
                marginRight: options.marginRight,
            },
            nextCache,
            hasInlineBreaks,
            usedFallbackMeasurements,
        };
    }

    const resolveBlockHeight = (
        node: ProseMirrorNode,
        pos: number,
        getDom: () => HTMLElement | null,
    ) => {
        const key = getBlockKey(node, pos);
        const cached = cache.get(key);
        const canUseCache = cached
            && !cached.isFallback
            && !cached.hasInlineBreaks
            && (cached.node === node || cached.node.eq(node));

        if (canUseCache) {
            nextCache.set(key, cached);

            return {
                key,
                height: cached.height,
                hasInlineBreaks: cached.hasInlineBreaks,
            };
        }

        const measurement = measureBlockHeight(view, pos, fallbackHeight, getDom());

        if (measurement.isFallback && cached && !cached.isFallback) {
            usedFallbackMeasurements = true;
            nextCache.set(key, cached);

            return {
                key,
                height: cached.height,
                hasInlineBreaks: cached.hasInlineBreaks,
            };
        }

        const height = Math.max(measurement.height, fallbackHeight);
        const entry = {
            node,
            height,
            isFallback: measurement.isFallback,
            hasInlineBreaks: measurement.hasInlineBreaks,
        };

        if (measurement.isFallback) {
            usedFallbackMeasurements = true;
        }

        nextCache.set(key, entry);

        return {
            key,
            height,
            hasInlineBreaks: entry.hasInlineBreaks,
        };
    };

    view.state.doc.forEach((node, offset) => {
        if (node.type.name === FOUNTAIN_COLUMN_GROUP_NODE_NAME) {
            return;
        }

        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return;
        }

        const attrs = node.attrs as Record<string, unknown>;
        const blockType = attrs.blockType as string | undefined;
        const isSplittable = blockType ? SPLITTABLE_BLOCK_TYPES.has(blockType) : false;
        const needsMoreContd = blockType ? MORE_CONTD_BLOCK_TYPES.has(blockType) : false;
        const isOrphanCandidate = blockType ? ORPHAN_PUSHDOWN_TYPES.has(blockType) : false;
        let blockDom: HTMLElement | null | undefined;
        const getBlockDom = () => {
            if (blockDom === undefined) {
                blockDom = view.nodeDOM(offset) as HTMLElement | null;
            }

            return blockDom;
        };
        const resolvedBlock = resolveBlockHeight(node, offset, getBlockDom);
        const blockHeight = resolvedBlock.height;
        const blockHasInlineBreaks = resolvedBlock.hasInlineBreaks;

        if (blockHasInlineBreaks) {
            hasInlineBreaks = true;
        }

        const ensurePageStart = () => {
            if (pageStartPos === null) {
                pageStartPos = offset;
                pageStartOffset = offsetCursor;
            }
        };

        const closePage = (endPosOverride?: number) => {
            if (pageStartPos === null) {
                return;
            }

            pages.push({
                index: pageIndex + 1,
                startPos: pageStartPos,
                endPos: endPosOverride ?? lastBlockEndPos ?? pageStartPos,
                startOffset: pageStartOffset,
                endOffset: offsetCursor,
            });

            pageIndex += 1;
            currentHeight = 0;
            pageStartPos = null;
        };

        const remainingBefore = Math.max(0, contentHeight - currentHeight);
        const remainingAfter = Math.max(0, remainingBefore - blockHeight);
        const shouldPushDown = isOrphanCandidate
            && blockHeight <= remainingBefore
            && remainingAfter < orphanThreshold;

        if (shouldPushDown && lastBlockEndPos !== null) {
            const spacerHeight = remainingBefore + bottomSpacing + topSpacing;
            const dividerOffset = remainingBefore + bottomSpacing;

            decorations.push(Decoration.widget(
                lastBlockEndPos,
                () => createSpacerElement(spacerHeight, options, dividerOffset),
                {side: 1},
            ));
            offsetCursor += spacerHeight;
            closePage();
        }

        let blockRemaining = blockHeight;

        while (blockRemaining > 0) {
            ensurePageStart();

            const spaceLeft = Math.max(0, contentHeight - currentHeight);
            const breakBuffer = Math.max(
                1,
                Math.round(options.lineHeightPx * 0.25),
            );
            const bufferedSpaceLeft = Math.max(0, spaceLeft - breakBuffer);
            const fits = currentHeight === 0 || blockRemaining <= bufferedSpaceLeft;

            if (fits) {
                currentHeight += blockRemaining;
                offsetCursor += blockRemaining;
                blockRemaining = 0;
                lastBlockEndPos = offset + node.nodeSize;
                break;
            }

            const domForSplit = getBlockDom();

            if (!isSplittable || !domForSplit) {
                if (lastBlockEndPos !== null) {
                    const remaining = Math.max(0, contentHeight - currentHeight);
                    const spacerHeight = remaining + bottomSpacing + topSpacing;
                    const dividerOffset = remaining + bottomSpacing;

                    decorations.push(Decoration.widget(
                        lastBlockEndPos,
                        () => createSpacerElement(spacerHeight, options, dividerOffset),
                        {side: 1},
                    ));
                    offsetCursor += spacerHeight;
                    closePage();
                    continue;
                }

                currentHeight += blockRemaining;
                offsetCursor += blockRemaining;
                blockRemaining = 0;
                lastBlockEndPos = offset + node.nodeSize;
                break;
            }

            const remaining = Math.max(0, contentHeight - currentHeight);
            const breakY = offsetCursor + remaining;
            const breakPos = resolveBreakPos(view, offset, node, domForSplit, breakY);
            const spacerHeight = bottomSpacing + topSpacing;
            const dividerOffset = bottomSpacing;
            const overlay = needsMoreContd && lastCharacterName
                ? {
                    moreText: '(MORE)',
                    contdText: `${lastCharacterName} (CONT'D)`,
                }
                : needsMoreContd
                    ? {moreText: '(MORE)'}
                    : undefined;

            currentHeight += remaining;
            offsetCursor += remaining;
            decorations.push(Decoration.widget(
                breakPos,
                () => createSpacerElement(spacerHeight, options, dividerOffset, overlay, true),
                {side: 1},
            ));
            hasInlineBreaks = true;

            const cacheEntry = nextCache.get(resolvedBlock.key);

            if (cacheEntry && !cacheEntry.hasInlineBreaks) {
                cacheEntry.hasInlineBreaks = true;
            }

            offsetCursor += spacerHeight;
            blockRemaining -= remaining;
            closePage(offset);
        }

        if (blockType === ELEMENT_CHARACTER || blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER) {
            const name = node.textContent.trim();

            lastCharacterName = name ? name.toUpperCase() : null;
        }
    });

    const remaining = Math.max(0, contentHeight - currentHeight);
    const endSpacerHeight = remaining + bottomSpacing;
    const endSpacerPos = lastBlockEndPos ?? 0;

    if (endSpacerHeight > 0) {
        decorations.push(Decoration.widget(
            endSpacerPos,
            () => createSpacerElement(endSpacerHeight, options),
            {side: 1},
        ));
        offsetCursor += endSpacerHeight;
    }

    if (pageStartPos === null) {
        pageStartPos = 0;
        pageStartOffset = 0;
    }

    pages.push({
        index: pageIndex + 1,
        startPos: pageStartPos,
        endPos: lastBlockEndPos ?? 0,
        startOffset: pageStartOffset,
        endOffset: offsetCursor,
    });

    return {
        decorations: DecorationSet.create(view.state.doc, decorations),
        pagination: {
            pageCount: pages.length,
            pages,
            pageHeight: options.pageHeight,
            contentHeight,
            lineHeightPx: fallbackHeight,
            marginTop: options.marginTop,
            marginBottom: options.marginBottom,
            marginLeft: options.marginLeft,
            marginRight: options.marginRight,
        },
        nextCache,
        hasInlineBreaks,
        usedFallbackMeasurements,
    };
};

export const FountainPaginationExtension = Extension.create<PaginationOptions, PaginationStorage>({
    name: 'FountainPagination',

    addOptions() {
        return DEFAULT_OPTIONS;
    },

    addStorage() {
        return {
            optionsVersion: 0,
            state: {
                pageCount: 1,
                pages: [],
                pageHeight: this.options.pageHeight,
                contentHeight: Math.max(
                    0,
                    this.options.pageHeight - this.options.marginTop - this.options.marginBottom,
                ),
                lineHeightPx: this.options.lineHeightPx,
                marginTop: this.options.marginTop,
                marginBottom: this.options.marginBottom,
                marginLeft: this.options.marginLeft,
                marginRight: this.options.marginRight,
            },
        };
    },

    addCommands() {
        return {
            updatePaginationSettings: (settings: Partial<PaginationOptions>) => () => {
                this.options = {
                    ...this.options,
                    ...settings,
                };

                this.storage.optionsVersion += 1;

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const extension = this;
        let lastOptionsVersion = -1;
        let lastContentWidth = 0;
        let lastHeightKey = '';
        let blockCache = new Map<string, BlockCacheEntry>();

        return [
            new Plugin({
                key: paginationKey,
                state: {
                    init: () => {
                        return {
                            decorations: DecorationSet.empty,
                            pagination: {
                                pageCount: 1,
                                pages: [],
                                pageHeight: extension.options.pageHeight,
                                contentHeight: Math.max(
                                    0,
                                    extension.options.pageHeight - extension.options.marginTop - extension.options.marginBottom,
                                ),
                                lineHeightPx: extension.options.lineHeightPx,
                                marginTop: extension.options.marginTop,
                                marginBottom: extension.options.marginBottom,
                                marginLeft: extension.options.marginLeft,
                                marginRight: extension.options.marginRight,
                            },
                        };
                    },
                    apply: (tr, pluginState: PaginationPluginState) => {
                        const meta = tr.getMeta(paginationKey) as PaginationPluginState | undefined;

                        if (meta) {
                            extension.storage.state = meta.pagination;

                            return meta;
                        }

                        if (tr.docChanged) {
                            return {
                                decorations: pluginState.decorations.map(tr.mapping, tr.doc),
                                pagination: pluginState.pagination,
                            };
                        }

                        return pluginState;
                    },
                },
                props: {
                    decorations(state) {
                        const pluginState = paginationKey.getState(state);

                        return pluginState?.decorations ?? DecorationSet.empty;
                    },
                },
                view: view => {
                    let destroyed = false;
                    let resizeObserver: ResizeObserver | null = null;
                    let lastInlineBreakDoc: ProseMirrorNode | null = null;
                    let lastFallbackDoc: ProseMirrorNode | null = null;
                    let isRecalcRunning = false;
                    let needsRecalc = false;

                    const runRecalc = () => {
                        if (destroyed) {
                            return;
                        }

                        if (isRecalcRunning) {
                            needsRecalc = true;

                            return;
                        }

                        isRecalcRunning = true;

                        do {
                            needsRecalc = false;

                            const optionsVersion = extension.storage.optionsVersion;
                            const heightKey = `${extension.options.pageWidth}|${extension.options.marginLeft}|` +
                                `${extension.options.marginRight}|${extension.options.lineHeightPx}`;

                            const contentWidth = Math.max(
                                0,
                                view.dom.clientWidth - extension.options.marginLeft - extension.options.marginRight,
                            );

                            const layoutChanged = heightKey !== lastHeightKey || contentWidth !== lastContentWidth;

                            lastOptionsVersion = optionsVersion;

                            if (layoutChanged) {
                                blockCache = new Map();
                                lastHeightKey = heightKey;
                                lastContentWidth = contentWidth;
                            }

                            const {
                                decorations,
                                pagination,
                                nextCache,
                                hasInlineBreaks,
                                usedFallbackMeasurements,
                            } = buildPaginationState(
                                view,
                                extension.options,
                                blockCache,
                            );

                            blockCache = nextCache;

                            extension.storage.state = pagination;

                            const tr = view.state.tr.setMeta(paginationKey, {decorations, pagination});

                            view.dispatch(tr);

                            if (hasInlineBreaks && lastInlineBreakDoc !== view.state.doc) {
                                lastInlineBreakDoc = view.state.doc;
                                needsRecalc = true;
                            }

                            if (usedFallbackMeasurements && lastFallbackDoc !== view.state.doc) {
                                lastFallbackDoc = view.state.doc;
                                needsRecalc = true;
                            }
                        } while (needsRecalc && !destroyed);

                        isRecalcRunning = false;
                    };

                    if (typeof ResizeObserver !== 'undefined') {
                        resizeObserver = new ResizeObserver(() => {
                            runRecalc();
                        });
                        resizeObserver.observe(view.dom);
                    }

                    if (typeof document !== 'undefined' && 'fonts' in document) {
                        document.fonts.ready.then(() => {
                            runRecalc();
                        }).catch(() => {});
                    }

                    runRecalc();

                    return {
                        update: view => {
                            const optionsVersion = extension.storage.optionsVersion;
                            // Only recalculate if content actually changed (not just selection)
                            const docChanged = view.state.tr.docChanged;
                            const heightKey = `${extension.options.pageWidth}|${extension.options.marginLeft}|` +
                                `${extension.options.marginRight}|${extension.options.lineHeightPx}`;

                            const contentWidth = Math.max(
                                0,
                                view.dom.clientWidth - extension.options.marginLeft - extension.options.marginRight,
                            );

                            const layoutChanged = heightKey !== lastHeightKey || contentWidth !== lastContentWidth;

                            // Skip recalculation if only selection changed and no layout/pagination changes needed
                            if (!docChanged && optionsVersion === lastOptionsVersion && !layoutChanged) {
                                return;
                            }

                            runRecalc();
                        },
                        destroy: () => {
                            destroyed = true;
                            resizeObserver?.disconnect();
                        },
                    };
                },
            }),
        ];
    },
});

const scaleValue = (value: number, scale: number) => value * scale;

export const createPaginationExtension = (settings: EditorSettings, scale = 1) => {
    const page = settings.page;
    const fontSize = settings.typography.fontSizePx;
    const lineHeight = settings.typography.lineHeight;

    return FountainPaginationExtension.configure({
        pageHeight: scaleValue(page.heightPx, scale),
        pageWidth: scaleValue(page.widthPx, scale),
        marginTop: scaleValue(page.marginTopPx, scale),
        marginBottom: scaleValue(page.marginBottomPx, scale),
        marginLeft: scaleValue(page.marginLeftPx, scale),
        marginRight: scaleValue(page.marginRightPx, scale),
        lineHeightPx: scaleValue(fontSize * lineHeight, scale),
        dividerColor: 'var(--color-divider)',
        dividerThickness: 1,
    });
};

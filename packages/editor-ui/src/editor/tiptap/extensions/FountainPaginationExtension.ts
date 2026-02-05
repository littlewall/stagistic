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
};

const paginationKey = new PluginKey<PaginationPluginState>('fountain-pagination');

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

const createSpacerElement = (
    height: number,
    options: PaginationOptions,
    dividerOffset?: number,
): HTMLDivElement => {
    const spacer = document.createElement('div');

    spacer.dataset.paginationSpacer = 'true';
    spacer.contentEditable = 'false';
    spacer.style.position = 'relative';
    spacer.style.height = `${Math.max(0, height)}px`;
    spacer.style.pointerEvents = 'none';

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

    return spacer;
};

const getBlockKey = (node: ProseMirrorNode, pos: number) => {
    const attrs = node.attrs as Record<string, unknown>;
    const id = attrs?.id;

    if (typeof id === 'string' && id.length > 0) {
        return id;
    }

    return `pos:${pos}`;
};

const measureBlockHeight = (
    view: EditorView,
    pos: number,
    fallbackHeight: number,
): number => {
    const dom = view.nodeDOM(pos) as HTMLElement | null;

    if (!dom) {
        return fallbackHeight;
    }

    const height = dom.offsetHeight;

    return height > 0 ? height : fallbackHeight;
};

const buildPaginationState = (
    view: EditorView,
    options: PaginationOptions,
    cache: Map<string, BlockCacheEntry>,
): {
    decorations: DecorationSet, pagination: PaginationState, nextCache: Map<string, BlockCacheEntry>,
} => {
    const decorations: Decoration[] = [];
    const pages: PageInfo[] = [];
    const nextCache = new Map<string, BlockCacheEntry>();

    const topSpacing = Math.max(0, options.marginTop);
    const bottomSpacing = Math.max(0, options.marginBottom);
    const contentHeight = Math.max(0, options.pageHeight - topSpacing - bottomSpacing);
    const fallbackHeight = Math.max(0, options.lineHeightPx);

    let currentHeight = 0;
    let pageIndex = 0;
    let pageStartPos: number | null = null;
    let pageStartOffset = 0;
    let offsetCursor = 0;
    let lastBlockEndPos: number | null = null;

    const resolveBlockHeight = (node: ProseMirrorNode, pos: number) => {
        const key = getBlockKey(node, pos);
        const cached = cache.get(key);

        if (cached && cached.node === node) {
            nextCache.set(key, cached);

            return cached.height;
        }

        if (cached && cached.node.eq(node)) {
            nextCache.set(key, cached);

            return cached.height;
        }

        const height = Math.max(measureBlockHeight(view, pos, fallbackHeight), fallbackHeight);
        const entry = {node, height};

        nextCache.set(key, entry);

        return height;
    };

    if (topSpacing > 0) {
        decorations.push(Decoration.widget(0, () => createSpacerElement(topSpacing, options), {side: -1}));
        offsetCursor += topSpacing;
    }

    view.state.doc.forEach((node, offset) => {
        if (node.type.name === FOUNTAIN_COLUMN_GROUP_NODE_NAME) {
            return;
        }

        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return;
        }

        const blockHeight = resolveBlockHeight(node, offset);

        if (pageStartPos === null) {
            pageStartPos = offset;
            pageStartOffset = offsetCursor - topSpacing;
        }

        const fits = currentHeight + blockHeight <= contentHeight || currentHeight === 0;

        if (!fits && lastBlockEndPos !== null) {
            const remaining = Math.max(0, contentHeight - currentHeight);
            const spacerHeight = remaining + bottomSpacing + topSpacing;
            const dividerOffset = remaining + bottomSpacing;

            decorations.push(Decoration.widget(
                lastBlockEndPos,
                () => createSpacerElement(spacerHeight, options, dividerOffset),
                {side: 1},
            ));
            offsetCursor += spacerHeight;

            pages.push({
                index: pageIndex + 1,
                startPos: pageStartPos,
                endPos: lastBlockEndPos,
                startOffset: pageStartOffset,
                endOffset: offsetCursor - topSpacing,
            });

            pageIndex += 1;
            currentHeight = 0;
            pageStartPos = null;
        }

        if (pageStartPos === null) {
            pageStartPos = offset;
            pageStartOffset = offsetCursor - topSpacing;
        }

        currentHeight += blockHeight;
        offsetCursor += blockHeight;
        lastBlockEndPos = offset + node.nodeSize;
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
        const extension = this;
        let pendingUpdate: number | null = null;
        let lastDoc: ProseMirrorNode | null = null;
        let lastOptionsVersion = -1;
        let lastStyleKey = '';
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

                        return pluginState;
                    },
                },
                props: {
                    decorations(state) {
                        const pluginState = paginationKey.getState(state);

                        return pluginState?.decorations ?? DecorationSet.empty;
                    },
                },
                view: () => ({
                    update: view => {
                        if (pendingUpdate !== null) {
                            cancelAnimationFrame(pendingUpdate);
                        }

                        pendingUpdate = requestAnimationFrame(() => {
                            pendingUpdate = null;

                            const optionsVersion = extension.storage.optionsVersion;
                            const docChanged = lastDoc !== view.state.doc;
                            const heightKey = `${extension.options.pageWidth}|${extension.options.marginLeft}|${extension.options.marginRight}|${extension.options.lineHeightPx}`;
                            const nextStyleKey = `${extension.options.pageWidth}|${extension.options.marginLeft}|${extension.options.marginRight}`;

                            if (nextStyleKey !== lastStyleKey) {
                                view.dom.style.width = '100%';
                                view.dom.style.maxWidth = `${extension.options.pageWidth}px`;
                                view.dom.style.paddingLeft = `${extension.options.marginLeft}px`;
                                view.dom.style.paddingRight = `${extension.options.marginRight}px`;
                                view.dom.style.boxSizing = 'border-box';
                                lastStyleKey = nextStyleKey;
                            }

                            const contentWidth = Math.max(
                                0,
                                view.dom.clientWidth - extension.options.marginLeft - extension.options.marginRight,
                            );

                            const layoutChanged = heightKey !== lastHeightKey || contentWidth !== lastContentWidth;

                            if (!docChanged && optionsVersion === lastOptionsVersion && !layoutChanged) {
                                return;
                            }

                            lastDoc = view.state.doc;
                            lastOptionsVersion = optionsVersion;

                            if (heightKey !== lastHeightKey || contentWidth !== lastContentWidth) {
                                blockCache = new Map();
                                lastHeightKey = heightKey;
                                lastContentWidth = contentWidth;
                            }

                            const {
                                decorations, pagination, nextCache,
                            } = buildPaginationState(
                                view,
                                extension.options,
                                blockCache,
                            );

                            blockCache = nextCache;

                            extension.storage.state = pagination;

                            const tr = view.state.tr.setMeta(paginationKey, {decorations, pagination});

                            view.dispatch(tr);
                        });
                    },
                    destroy: () => {
                        if (pendingUpdate !== null) {
                            cancelAnimationFrame(pendingUpdate);
                            pendingUpdate = null;
                        }
                    },
                }),
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

import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import {DecorationSet} from '@tiptap/pm/view';

import {buildPaginationState} from '../layout/buildPaginationState';
import {createInitialPaginationState} from '../state/createInitialPaginationState';
import {
    type BlockCacheEntry,
    type PaginationExtensionAdapter,
    type PaginationPluginState,
} from '../types';

export const paginationKey = new PluginKey<PaginationPluginState>('fountain-pagination');

export const createPaginationPlugin = (extension: PaginationExtensionAdapter) => {
    let lastOptionsVersion = -1;
    let lastContentWidth = 0;
    let lastHeightKey = '';
    let blockCache = new Map<string, BlockCacheEntry>();

    return new Plugin({
        key: paginationKey,
        state: {
            init: () => {
                return {
                    decorations: DecorationSet.empty,
                    pagination: createInitialPaginationState(extension.options),
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
            let recalcFrameId = 0;

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
                    const heightKey = `${extension.options.pageWidth}|${extension.options.marginLeft}|`
                        + `${extension.options.marginRight}|${extension.options.lineHeightPx}`;

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

                    const tr = view.state.tr.setMeta(paginationKey, {
                        decorations,
                        pagination,
                    });

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

            const scheduleRecalc = () => {
                if (destroyed) {
                    return;
                }

                if (recalcFrameId) {
                    window.cancelAnimationFrame(recalcFrameId);
                }

                recalcFrameId = window.requestAnimationFrame(() => {
                    recalcFrameId = 0;
                    runRecalc();
                });
            };

            if (typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver(() => {
                    // Defer dispatching transactions outside the ResizeObserver delivery.
                    scheduleRecalc();
                });
                resizeObserver.observe(view.dom);
            }

            if (typeof document !== 'undefined' && 'fonts' in document) {
                document.fonts.ready.then(() => {
                    scheduleRecalc();
                }).catch(() => {});
            }

            scheduleRecalc();

            return {
                update: (view, prevState) => {
                    const optionsVersion = extension.storage.optionsVersion;
                    const docChanged = !prevState.doc.eq(view.state.doc);
                    const heightKey = `${extension.options.pageWidth}|${extension.options.marginLeft}|`
                        + `${extension.options.marginRight}|${extension.options.lineHeightPx}`;

                    const contentWidth = Math.max(
                        0,
                        view.dom.clientWidth - extension.options.marginLeft - extension.options.marginRight,
                    );

                    const layoutChanged = heightKey !== lastHeightKey || contentWidth !== lastContentWidth;

                    if (!docChanged && optionsVersion === lastOptionsVersion && !layoutChanged) {
                        return;
                    }

                    scheduleRecalc();
                },
                destroy: () => {
                    destroyed = true;
                    if (recalcFrameId) {
                        window.cancelAnimationFrame(recalcFrameId);
                        recalcFrameId = 0;
                    }

                    resizeObserver?.disconnect();
                },
            };
        },
    });
};

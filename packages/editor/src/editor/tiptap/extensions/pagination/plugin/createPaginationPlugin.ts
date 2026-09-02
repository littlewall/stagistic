import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    type EditorState,
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import {DecorationSet} from '@tiptap/pm/view';

import {incrementPaginationRecalcCount} from '../../../../perf/editorPerfMetrics';
import {buildPaginationState} from '../layout/buildPaginationState';
import {createInitialPaginationState} from '../state/createInitialPaginationState';
import {
    type BlockCacheEntry,
    type PaginationPluginState,
    type PaginationStorage,
} from '../types';

export const paginationKey = new PluginKey<PaginationPluginState>('script-pagination');
export const PAGINATION_CONTROL_META_KEY = 'script-pagination-control';

export const getPaginationPluginState = (state: EditorState): PaginationPluginState | null => {
    return paginationKey.getState(state) ?? null;
};

const TYPING_RECALC_DELAY_MS = 250;

const computeLayoutMetrics = (storage: PaginationStorage, view: {dom: {clientWidth: number}}) => {
    const options = storage.options;
    const heightKey = `${options.pageWidth}|${options.marginLeft}|`
        + `${options.marginRight}|${options.lineHeightPx}`;
    const contentWidth = Math.max(
        0,
        view.dom.clientWidth - options.marginLeft - options.marginRight,
    );

    return {heightKey, contentWidth};
};

export const createPaginationPlugin = (storage: PaginationStorage) => {
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
                    pagination: createInitialPaginationState(storage.options),
                    forceRecalcToken: storage.forceRecalcToken,
                    hasComputed: false,
                };
            },
            apply: (tr, pluginState: PaginationPluginState) => {
                const meta = tr.getMeta(paginationKey) as PaginationPluginState | undefined;
                const controlMeta = tr.getMeta(PAGINATION_CONTROL_META_KEY) as {
                    forceRecalcToken?: number,
                } | undefined;

                if (meta) {
                    storage.state = meta.pagination;
                    storage.forceRecalcToken = meta.forceRecalcToken;

                    return meta;
                }

                if (
                    controlMeta
                    && typeof controlMeta.forceRecalcToken === 'number'
                    && controlMeta.forceRecalcToken !== pluginState.forceRecalcToken
                ) {
                    storage.forceRecalcToken = controlMeta.forceRecalcToken;

                    return {
                        ...pluginState,
                        forceRecalcToken: controlMeta.forceRecalcToken,
                    };
                }

                if (tr.docChanged) {
                    return {
                        decorations: pluginState.decorations.map(tr.mapping, tr.doc),
                        pagination: pluginState.pagination,
                        forceRecalcToken: pluginState.forceRecalcToken,
                        hasComputed: pluginState.hasComputed,
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
            let deferredTypingTimeout: number | null = null;

            const runRecalc = () => {
                if (destroyed) {
                    return;
                }

                /*
                 * A detached or not-yet-laid-out view (cached surface parked
                 * between mounts, or freshly re-attached before layout) has no
                 * geometry to measure — recalc would corrupt the preserved
                 * state. The ResizeObserver fires again once the view has real
                 * dimensions and reschedules.
                 */
                if (!view.dom.isConnected || view.dom.clientWidth === 0) {
                    return;
                }

                if (isRecalcRunning) {
                    needsRecalc = true;

                    return;
                }

                isRecalcRunning = true;

                do {
                    needsRecalc = false;

                    const optionsVersion = storage.optionsVersion;
                    const {heightKey, contentWidth} = computeLayoutMetrics(storage, view);
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
                        storage.options,
                        blockCache,
                    );

                    blockCache = nextCache;

                    storage.state = pagination;

                    const tr = view.state.tr.setMeta(paginationKey, {
                        decorations,
                        pagination,
                        forceRecalcToken: storage.forceRecalcToken,
                        hasComputed: true,
                    });

                    view.dispatch(tr);
                    incrementPaginationRecalcCount();

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

            const scheduleImmediateRecalc = () => {
                if (destroyed) {
                    return;
                }

                if (deferredTypingTimeout !== null) {
                    window.clearTimeout(deferredTypingTimeout);
                    deferredTypingTimeout = null;
                }

                if (recalcFrameId) {
                    window.cancelAnimationFrame(recalcFrameId);
                }

                recalcFrameId = window.requestAnimationFrame(() => {
                    recalcFrameId = 0;
                    runRecalc();
                });
            };

            const scheduleTypingRecalc = () => {
                if (destroyed) {
                    return;
                }

                if (deferredTypingTimeout !== null) {
                    window.clearTimeout(deferredTypingTimeout);
                    deferredTypingTimeout = null;
                }

                deferredTypingTimeout = window.setTimeout(() => {
                    deferredTypingTimeout = null;
                    scheduleImmediateRecalc();
                }, TYPING_RECALC_DELAY_MS);
            };

            if (typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver(() => {
                    // Defer dispatching transactions outside the ResizeObserver delivery.
                    scheduleImmediateRecalc();
                });
                resizeObserver.observe(view.dom);
            }

            if (typeof document !== 'undefined' && 'fonts' in document) {
                document.fonts.ready.then(() => {
                    scheduleImmediateRecalc();
                }).catch(() => {});
            }

            scheduleImmediateRecalc();

            return {
                update: (view, prevState) => {
                    const optionsVersion = storage.optionsVersion;
                    const docChanged = !prevState.doc.eq(view.state.doc);
                    const {heightKey, contentWidth} = computeLayoutMetrics(storage, view);
                    const layoutChanged = heightKey !== lastHeightKey || contentWidth !== lastContentWidth;
                    const previousPluginState = paginationKey.getState(prevState);
                    const currentPluginState = paginationKey.getState(view.state);
                    const forceRecalcTokenChanged = (
                        previousPluginState?.forceRecalcToken ?? 0
                    ) !== (
                        currentPluginState?.forceRecalcToken ?? 0
                    );

                    if (
                        !docChanged
                        && optionsVersion === lastOptionsVersion
                        && !layoutChanged
                        && !forceRecalcTokenChanged
                    ) {
                        return;
                    }

                    if (forceRecalcTokenChanged || layoutChanged || optionsVersion !== lastOptionsVersion) {
                        scheduleImmediateRecalc();

                        return;
                    }

                    scheduleTypingRecalc();
                },
                destroy: () => {
                    destroyed = true;
                    if (recalcFrameId) {
                        window.cancelAnimationFrame(recalcFrameId);
                        recalcFrameId = 0;
                    }

                    if (deferredTypingTimeout !== null) {
                        window.clearTimeout(deferredTypingTimeout);
                        deferredTypingTimeout = null;
                    }

                    resizeObserver?.disconnect();
                },
            };
        },
    });
};

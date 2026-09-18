import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {EditorView} from '@tiptap/pm/view';

import {getBlockKey} from '../measure/getBlockKey';
import {isBlockElementHidden} from '../measure/isBlockElementHidden';
import {measureBlockHeight} from '../measure/measureBlockHeight';
import type {BlockCacheEntry} from '../types';

interface ResolveBlockMeasurementArgs {
    view: EditorView,
    node: ProseMirrorNode,
    pos: number,
    getDom: () => HTMLElement | null,
    cache: Map<string, BlockCacheEntry>,
    nextCache: Map<string, BlockCacheEntry>,
    fallbackHeight: number,
}

export const resolveBlockMeasurement = ({
    view,
    node,
    pos,
    getDom,
    cache,
    nextCache,
    fallbackHeight,
}: ResolveBlockMeasurementArgs) => {
    const key = getBlockKey(node, pos);
    const cached = cache.get(key);
    const dom = getDom() ?? (view.nodeDOM(pos) as HTMLElement | null);
    const domHeight = dom?.offsetHeight ?? 0;
    const isHidden = isBlockElementHidden(dom);

    /*
     * A hidden block contributes nothing to the page, and its last measured
     * height must not be served from the cache — that is what would keep a
     * collapsed scene occupying the page it is no longer drawn on.
     */
    if (isHidden) {
        nextCache.set(key, {
            node,
            height: 0,
            isFallback: false,
            hasInlineBreaks: false,
            isHidden: true,
            domHeight: 0,
        });

        return {
            key,
            height: 0,
            hasInlineBreaks: false,
            isHidden: true,
            usedFallbackMeasurement: false,
        };
    }

    /*
     * A decoration can restyle a block — a collapsed scene heading grows room for
     * its summary line — without the node changing at all, so the rendered height
     * has to agree with the cached one before the measurement can be reused.
     */
    const canUseCache = cached
        && !cached.isFallback
        && !cached.isHidden
        && cached.domHeight === domHeight
        && (cached.node === node || cached.node.eq(node));

    if (canUseCache) {
        nextCache.set(key, cached);

        return {
            key,
            height: cached.height,
            hasInlineBreaks: cached.hasInlineBreaks,
            isHidden: false,
            usedFallbackMeasurement: false,
        };
    }

    const measurement = measureBlockHeight(view, pos, fallbackHeight, dom);

    if (measurement.isFallback && cached && !cached.isFallback) {
        nextCache.set(key, cached);

        return {
            key,
            height: cached.height,
            hasInlineBreaks: cached.hasInlineBreaks,
            isHidden: false,
            usedFallbackMeasurement: true,
        };
    }

    const height = Math.max(measurement.height, fallbackHeight);
    const entry = {
        node,
        height,
        isFallback: measurement.isFallback,
        hasInlineBreaks: measurement.hasInlineBreaks,
        isHidden: false,
        domHeight,
    };

    nextCache.set(key, entry);

    return {
        key,
        height,
        hasInlineBreaks: entry.hasInlineBreaks,
        isHidden: false,
        usedFallbackMeasurement: measurement.isFallback,
    };
};

import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {EditorView} from '@tiptap/pm/view';

import {getBlockKey} from '../measure/getBlockKey';
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
    const canUseCache = cached
        && !cached.isFallback
        && (cached.node === node || cached.node.eq(node));

    if (canUseCache) {
        nextCache.set(key, cached);

        return {
            key,
            height: cached.height,
            hasInlineBreaks: cached.hasInlineBreaks,
            usedFallbackMeasurement: false,
        };
    }

    const measurement = measureBlockHeight(view, pos, fallbackHeight, getDom());

    if (measurement.isFallback && cached && !cached.isFallback) {
        nextCache.set(key, cached);

        return {
            key,
            height: cached.height,
            hasInlineBreaks: cached.hasInlineBreaks,
            usedFallbackMeasurement: true,
        };
    }

    const height = Math.max(measurement.height, fallbackHeight);
    const entry = {
        node,
        height,
        isFallback: measurement.isFallback,
        hasInlineBreaks: measurement.hasInlineBreaks,
    };

    nextCache.set(key, entry);

    return {
        key,
        height,
        hasInlineBreaks: entry.hasInlineBreaks,
        usedFallbackMeasurement: measurement.isFallback,
    };
};

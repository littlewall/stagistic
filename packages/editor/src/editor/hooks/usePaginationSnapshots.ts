import type {Editor as TiptapEditor} from '@tiptap/react';
import {useCallback, useRef} from 'react';

import type {EditorLiveBlockPagesSnapshot, EditorLiveScenePlacementSnapshot} from '../contracts';
import {EMPTY_BLOCK_PAGES, EMPTY_SCENE_PLACEMENT} from '../live/store';
import {buildBlockPages} from '../runtime/buildBlockPages';
import {buildScenePlacements} from '../runtime/buildScenePlacements';
import {getPaginationPluginState} from '../tiptap/extensions';
import type {PaginationState} from '../tiptap/extensions/pagination/types';

export interface PaginationSnapshots {
    scenePlacement: EditorLiveScenePlacementSnapshot,
    blockPages: EditorLiveBlockPagesSnapshot,
}

/*
 * Scene placement and block pages are derived from the last measured pagination
 * pass. Recomputing walks the doc, so we rebuild only when the pagination object
 * identity changes (a real recalc) and keep each snapshot ref while its
 * fingerprint is unchanged so the live store skips a redundant emit. The two
 * snapshots have separate fingerprints: scene-only consumers do not re-render
 * when a non-heading block moves.
 */
export const usePaginationSnapshots = (): (targetEditor: TiptapEditor) => PaginationSnapshots => {
    const lastPaginationRef = useRef<PaginationState | null>(null);
    const scenePlacementRef = useRef<EditorLiveScenePlacementSnapshot>(EMPTY_SCENE_PLACEMENT);
    const sceneFingerprintRef = useRef('');
    const blockPagesRef = useRef<EditorLiveBlockPagesSnapshot>(EMPTY_BLOCK_PAGES);
    const blockFingerprintRef = useRef('');

    return useCallback((targetEditor: TiptapEditor): PaginationSnapshots => {
        const paginationPlugin = getPaginationPluginState(targetEditor.state);
        const pagination = paginationPlugin?.pagination ?? null;

        if (pagination && paginationPlugin?.hasComputed && pagination !== lastPaginationRef.current) {
            lastPaginationRef.current = pagination;

            const scenes = buildScenePlacements(targetEditor.view, pagination);

            if (scenes.fingerprint !== sceneFingerprintRef.current || !scenePlacementRef.current.hasComputed) {
                sceneFingerprintRef.current = scenes.fingerprint;
                scenePlacementRef.current = {byBlockId: scenes.byBlockId, hasComputed: true};
            }

            const blocks = buildBlockPages(targetEditor.view, pagination);

            if (blocks.fingerprint !== blockFingerprintRef.current || !blockPagesRef.current.hasComputed) {
                blockFingerprintRef.current = blocks.fingerprint;
                blockPagesRef.current = {byBlockId: blocks.byBlockId, hasComputed: true};
            }
        }

        return {scenePlacement: scenePlacementRef.current, blockPages: blockPagesRef.current};
    }, []);
};

import {
    type useScriptMusic,
} from '@stagistic/app-core';
import type {UpdateMusicRequest} from '@stagistic/editor';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    CreateScriptMusicInput,
    ScriptMusicListItem,
    UpdateScriptMusicInput,
} from './types';

export const useScriptMusicState = (
    scriptId: string | null,
    catalog: ReturnType<typeof useScriptMusic>,
) => {
    const [assignmentIntentState, setAssignmentIntentState] = useState<{
        scriptId: string | null,
        values: Record<string, boolean>,
    }>({scriptId, values: {}});
    const [updateMusicRequest, setUpdateMusicRequest] = useState<UpdateMusicRequest | null>(null);
    const updateMusicRequestIdRef = useRef(0);

    const requestEditorMusicUpdate = useCallback((
        musicId: string,
        title: string,
        kind: 'song' | 'instrumental',
    ) => {
        const requestId = updateMusicRequestIdRef.current + 1;

        updateMusicRequestIdRef.current = requestId;
        setUpdateMusicRequest({
            musicId,
            title,
            kind,
            requestId,
        });
    }, []);

    useEffect(() => {
        setUpdateMusicRequest(null);
    }, [scriptId]);

    useEffect(() => {
        setAssignmentIntentState(previous => {
            if (previous.scriptId !== scriptId) {
                return {scriptId, values: {}};
            }

            const pendingEntries = Object.entries(previous.values).filter(([musicId, assigned]) => {
                const music = catalog.music.find(candidate => candidate.id === musicId);

                return music ? Boolean(music.startBlockId) !== assigned : false;
            });

            return pendingEntries.length === Object.keys(previous.values).length
                ? previous
                : {scriptId, values: Object.fromEntries(pendingEntries)};
        });
    }, [catalog.music, scriptId]);

    const assignmentIntents = assignmentIntentState.scriptId === scriptId
        ? assignmentIntentState.values
        : {};

    const music = useMemo<ScriptMusicListItem[]>(() => catalog.music.map(music => ({
        id: music.id,
        title: music.title,
        kind: music.kind === 'instrumental' ? 'instrumental' : 'song',
        assignmentLabel: assignmentIntents[music.id] ?? Boolean(music.startBlockId)
            ? 'Assigned'
            : null,
    })), [assignmentIntents, catalog.music]);

    const createMusic = useCallback(async (input: CreateScriptMusicInput) => {
        const created = await catalog.createMusic(input);

        if (!created) {
            return null;
        }

        return music.find(music => music.id === created.id) ?? {
            id: created.id,
            title: created.title,
            kind: created.kind === 'instrumental' ? 'instrumental' : 'song',
            assignmentLabel: null,
        };
    }, [catalog, music]);

    const updateMusic = useCallback(async (musicId: string, input: UpdateScriptMusicInput) => {
        const title = input.title.trim();
        const original = catalog.music.find(music => music.id === musicId);

        if (!scriptId || !musicId || !title || !original) {
            return null;
        }

        requestEditorMusicUpdate(musicId, title, input.kind);

        try {
            const updated = await catalog.updateMusic(musicId, {...input, title});

            return updated ? {
                id: updated.id,
                title: updated.title,
                kind: updated.kind === 'instrumental' ? 'instrumental' : 'song',
                assignmentLabel: updated.startBlockId ? 'Assigned' : null,
            } : null;
        } catch (error) {
            requestEditorMusicUpdate(
                original.id,
                original.title,
                original.kind === 'instrumental' ? 'instrumental' : 'song',
            );
            throw error;
        }
    }, [
        catalog,
        requestEditorMusicUpdate,
        scriptId,
    ]);

    const markAssignmentIntent = useCallback((musicId: string, assigned: boolean) => {
        setAssignmentIntentState(previous => ({
            scriptId,
            values: {
                ...previous.scriptId === scriptId ? previous.values : {},
                [musicId]: assigned,
            },
        }));
    }, [scriptId]);
    const markMusicAssigned = useCallback(
        (musicId: string) => markAssignmentIntent(musicId, true),
        [markAssignmentIntent],
    );
    const markMusicUnassigned = useCallback(
        (musicId: string) => markAssignmentIntent(musicId, false),
        [markAssignmentIntent],
    );
    const unassignMusic = useCallback((musicId: string) => {
        markAssignmentIntent(musicId, false);

        return Promise.resolve();
    }, [markAssignmentIntent]);

    return {
        music,
        createMusic,
        deleteMusic: catalog.deleteMusic,
        markMusicAssigned,
        markMusicUnassigned,
        updateMusic,
        updateMusicRequest,
        unassignMusic,
        error: catalog.error,
        isLoading: catalog.isLoading,
    };
};

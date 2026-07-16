import {
    useScriptCues,
    type useScriptRepository,
} from '@stagistic/app-core';
import type {UpdateCueRequest} from '@stagistic/editor';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    CreateScriptCueInput,
    ScriptCueListItem,
    UpdateScriptCueInput,
} from './types';

type ScriptRepository = ReturnType<typeof useScriptRepository>;

export const useScriptCuesState = (
    scriptId: string | null,
    scriptRepository: ScriptRepository,
) => {
    const catalog = useScriptCues(scriptId, scriptRepository);
    const [assignmentIntentState, setAssignmentIntentState] = useState<{
        scriptId: string | null,
        values: Record<string, boolean>,
    }>({scriptId, values: {}});
    const [updateCueRequest, setUpdateCueRequest] = useState<UpdateCueRequest | null>(null);
    const updateCueRequestIdRef = useRef(0);

    const requestEditorCueUpdate = useCallback((
        cueId: string,
        title: string,
        kind: 'song' | 'instrumental',
    ) => {
        const requestId = updateCueRequestIdRef.current + 1;

        updateCueRequestIdRef.current = requestId;
        setUpdateCueRequest({
            cueId,
            title,
            kind,
            requestId,
        });
    }, []);

    useEffect(() => {
        setUpdateCueRequest(null);
    }, [scriptId]);

    useEffect(() => {
        setAssignmentIntentState(previous => {
            if (previous.scriptId !== scriptId) {
                return {scriptId, values: {}};
            }

            const pendingEntries = Object.entries(previous.values).filter(([cueId, assigned]) => {
                const cue = catalog.cues.find(candidate => candidate.id === cueId);

                return cue ? Boolean(cue.startBlockId) !== assigned : false;
            });

            return pendingEntries.length === Object.keys(previous.values).length
                ? previous
                : {scriptId, values: Object.fromEntries(pendingEntries)};
        });
    }, [catalog.cues, scriptId]);

    const assignmentIntents = assignmentIntentState.scriptId === scriptId
        ? assignmentIntentState.values
        : {};

    const cues = useMemo<ScriptCueListItem[]>(() => catalog.cues.map(cue => ({
        id: cue.id,
        title: cue.title,
        kind: cue.kind === 'instrumental' ? 'instrumental' : 'song',
        assignmentLabel: assignmentIntents[cue.id] ?? Boolean(cue.startBlockId)
            ? 'Assigned'
            : null,
    })), [assignmentIntents, catalog.cues]);

    const createCue = useCallback(async (input: CreateScriptCueInput) => {
        const created = await catalog.createCue(input);

        if (!created) {
            return null;
        }

        return cues.find(cue => cue.id === created.id) ?? {
            id: created.id,
            title: created.title,
            kind: created.kind === 'instrumental' ? 'instrumental' : 'song',
            assignmentLabel: null,
        };
    }, [catalog, cues]);

    const updateCue = useCallback(async (cueId: string, input: UpdateScriptCueInput) => {
        const title = input.title.trim();
        const original = catalog.cues.find(cue => cue.id === cueId);

        if (!scriptId || !cueId || !title || !original) {
            return null;
        }

        requestEditorCueUpdate(cueId, title, input.kind);

        try {
            const updated = await catalog.updateCue(cueId, {...input, title});

            return updated ? {
                id: updated.id,
                title: updated.title,
                kind: updated.kind === 'instrumental' ? 'instrumental' : 'song',
                assignmentLabel: updated.startBlockId ? 'Assigned' : null,
            } : null;
        } catch (error) {
            requestEditorCueUpdate(
                original.id,
                original.title,
                original.kind === 'instrumental' ? 'instrumental' : 'song',
            );
            throw error;
        }
    }, [
        catalog,
        requestEditorCueUpdate,
        scriptId,
    ]);

    const markAssignmentIntent = useCallback((cueId: string, assigned: boolean) => {
        setAssignmentIntentState(previous => ({
            scriptId,
            values: {
                ...previous.scriptId === scriptId ? previous.values : {},
                [cueId]: assigned,
            },
        }));
    }, [scriptId]);
    const markCueAssigned = useCallback(
        (cueId: string) => markAssignmentIntent(cueId, true),
        [markAssignmentIntent],
    );
    const markCueUnassigned = useCallback(
        (cueId: string) => markAssignmentIntent(cueId, false),
        [markAssignmentIntent],
    );
    const unassignCue = useCallback((cueId: string) => {
        markAssignmentIntent(cueId, false);

        return Promise.resolve();
    }, [markAssignmentIntent]);

    return {
        cues,
        createCue,
        deleteCue: catalog.deleteCue,
        markCueAssigned,
        markCueUnassigned,
        updateCue,
        updateCueRequest,
        unassignCue,
        error: catalog.error,
        isLoading: catalog.isLoading,
    };
};

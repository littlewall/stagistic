import {type useScriptRepository} from '@stagistic/app-core';
import type {UpdateCueRequest} from '@stagistic/editor';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    CreateScriptCueInput,
    ScriptCueListItem,
    UpdateScriptCueInput,
} from './types';

type ScriptRepository = ReturnType<typeof useScriptRepository>;
type StoredScriptCue = Awaited<ReturnType<ScriptRepository['listScriptCues']>>[number];

const toScriptCueListItem = (cue: StoredScriptCue): ScriptCueListItem => ({
    id: cue.id,
    title: cue.title,
    kind: cue.kind === 'instrumental' ? 'instrumental' : 'song',
    assignmentLabel: cue.startBlockId ? 'Assigned' : null,
});

export const useScriptCuesState = (
    scriptId: string | null,
    scriptRepository: ScriptRepository,
) => {
    const [cues, setCues] = useState<ScriptCueListItem[]>([]);
    const [updateCueRequest, setUpdateCueRequest] = useState<UpdateCueRequest | null>(null);
    const updateCueRequestIdRef = useRef(0);

    useEffect(() => {
        if (!scriptId) {
            setCues([]);

            return;
        }

        let isCurrent = true;

        const loadCues = async () => {
            const storedCues = await scriptRepository.listScriptCues(scriptId);

            if (isCurrent) {
                setCues(storedCues.map(toScriptCueListItem));
            }
        };

        void loadCues();

        return () => {
            isCurrent = false;
        };
    }, [scriptId, scriptRepository]);

    const createCue = useCallback(async (input: CreateScriptCueInput) => {
        if (!scriptId) {
            return null;
        }

        const title = input.title.trim();

        if (!title) {
            return null;
        }

        const createdCue = await scriptRepository.createScriptCue(scriptId, {
            title,
            kind: input.kind,
        });

        if (!createdCue) {
            return null;
        }

        const listItem = toScriptCueListItem(createdCue);

        setCues(previous => [...previous, listItem]);

        return listItem;
    }, [scriptId, scriptRepository]);

    const markCueAssigned = useCallback((cueId: string) => {
        setCues(previous => previous.map(cue => {
            return cue.id === cueId ? {...cue, assignmentLabel: 'Assigned'} : cue;
        }));
    }, []);

    const updateCue = useCallback(async (cueId: string, input: UpdateScriptCueInput) => {
        if (!scriptId || !cueId) {
            return null;
        }

        const title = input.title.trim();

        if (!title) {
            return null;
        }

        const requestId = updateCueRequestIdRef.current + 1;

        updateCueRequestIdRef.current = requestId;
        setCues(previous => previous.map(cue => {
            return cue.id === cueId ? {
                ...cue,
                title,
                kind: input.kind,
            } : cue;
        }));
        setUpdateCueRequest({
            cueId,
            title,
            kind: input.kind,
            requestId,
        });

        const updatedCue = await scriptRepository.updateScriptCue(scriptId, cueId, {
            title,
            kind: input.kind,
        });

        if (!updatedCue) {
            const storedCues = await scriptRepository.listScriptCues(scriptId);

            setCues(storedCues.map(toScriptCueListItem));

            return null;
        }

        const listItem = toScriptCueListItem(updatedCue);

        setCues(previous => previous.map(cue => {
            return cue.id === cueId ? listItem : cue;
        }));

        return listItem;
    }, [scriptId, scriptRepository]);

    const markCueUnassigned = useCallback((cueId: string) => {
        setCues(previous => previous.map(cue => {
            return cue.id === cueId ? {...cue, assignmentLabel: null} : cue;
        }));
    }, []);

    const deleteCue = useCallback(async (cueId: string) => {
        if (!scriptId || !cueId) {
            return;
        }

        await scriptRepository.deleteScriptCue(scriptId, cueId);
        setCues(previous => previous.filter(cue => cue.id !== cueId));
    }, [scriptId, scriptRepository]);

    const unassignCue = useCallback(async (cueId: string) => {
        if (!scriptId || !cueId) {
            return;
        }

        const updatedCue = await scriptRepository.unassignScriptCue(scriptId, cueId);

        if (!updatedCue) {
            return;
        }

        setCues(previous => previous.map(cue => {
            return cue.id === cueId ? toScriptCueListItem(updatedCue) : cue;
        }));
    }, [scriptId, scriptRepository]);

    return {
        cues,
        createCue,
        deleteCue,
        markCueAssigned,
        markCueUnassigned,
        updateCue,
        updateCueRequest,
        unassignCue,
    };
};

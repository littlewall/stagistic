import {type useScriptRepository} from '@stagistic/app-core';
import {useCallback, useEffect, useState} from 'react';

import type {
    CreateScriptCueInput,
    ScriptCueListItem,
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

        setCues(previous => [
            ...previous,
            listItem,
        ]);

        return listItem;
    }, [scriptId, scriptRepository]);

    const markCueAssigned = useCallback((cueId: string) => {
        setCues(previous => previous.map(cue => cue.id === cueId
            ? {...cue, assignmentLabel: 'Assigned'}
            : cue));
    }, []);

    const markCueUnassigned = useCallback((cueId: string) => {
        setCues(previous => previous.map(cue => cue.id === cueId
            ? {...cue, assignmentLabel: null}
            : cue));
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

        setCues(previous => previous.map(cue => cue.id === cueId
            ? toScriptCueListItem(updatedCue)
            : cue));
    }, [scriptId, scriptRepository]);

    return {
        cues,
        createCue,
        deleteCue,
        markCueAssigned,
        markCueUnassigned,
        unassignCue,
    };
};

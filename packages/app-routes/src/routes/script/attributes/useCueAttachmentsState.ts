import {type useScriptRepository} from '@stagistic/app-core';
import {useCallback, useState} from 'react';

type ScriptRepository = ReturnType<typeof useScriptRepository>;

export const INTEGRATED_SCORE_ROLE = 'integrated_score';

export interface CueAttachmentRecord {
    id: string,
    filename: string,
    sizeBytes: number,
    storageKey: string,
}

export interface CueAttachmentsState {
    integratedScoresByCue: Map<string, CueAttachmentRecord | null>,
    uploadingCueIds: Set<string>,
    loadCue: (cueId: string) => Promise<void>,
    uploadIntegratedScore: (cueId: string, file: File) => Promise<void>,
    removeIntegratedScore: (cueId: string) => Promise<void>,
    getBlob: (storageKey: string) => Promise<Blob | null>,
}

export const useCueAttachmentsState = (
    scriptId: string | null,
    scriptRepository: ScriptRepository,
): CueAttachmentsState => {
    const [integratedScoresByCue, setIntegratedScoresByCue]
        = useState<Map<string, CueAttachmentRecord | null>>(new Map());
    const [uploadingCueIds, setUploadingCueIds] = useState<Set<string>>(new Set());

    const setIntegratedScore = useCallback((cueId: string, attachment: CueAttachmentRecord | null) => {
        setIntegratedScoresByCue(previous => {
            const next = new Map(previous);

            next.set(cueId, attachment);

            return next;
        });
    }, []);

    const loadCue = useCallback(async (cueId: string) => {
        const attachment = await scriptRepository.getCueAttachment(cueId, INTEGRATED_SCORE_ROLE);

        setIntegratedScore(cueId, attachment);
    }, [scriptRepository, setIntegratedScore]);

    const uploadIntegratedScore = useCallback(async (cueId: string, file: File) => {
        if (!scriptId) {
            return;
        }

        setUploadingCueIds(previous => new Set(previous).add(cueId));

        try {
            const attachment = await scriptRepository.setCueAttachment(
                scriptId,
                cueId,
                INTEGRATED_SCORE_ROLE,
                {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    blob: file,
                },
            );

            setIntegratedScore(cueId, attachment);
        } finally {
            setUploadingCueIds(previous => {
                const next = new Set(previous);

                next.delete(cueId);

                return next;
            });
        }
    }, [
        scriptId,
        scriptRepository,
        setIntegratedScore,
    ]);

    const removeIntegratedScore = useCallback(async (cueId: string) => {
        if (!scriptId) {
            return;
        }

        await scriptRepository.removeCueAttachment(scriptId, cueId, INTEGRATED_SCORE_ROLE);
        setIntegratedScore(cueId, null);
    }, [
        scriptId,
        scriptRepository,
        setIntegratedScore,
    ]);

    const getBlob = useCallback((storageKey: string) => {
        return scriptRepository.getAttachmentBlob(storageKey);
    }, [scriptRepository]);

    return {
        integratedScoresByCue,
        uploadingCueIds,
        loadCue,
        uploadIntegratedScore,
        removeIntegratedScore,
        getBlob,
    };
};

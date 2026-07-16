import {
    type ScriptRepository,
    useScriptAttachments,
} from '@stagistic/app-core';
import {useCallback, useMemo} from 'react';

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
    uploadIntegratedScore: (cueId: string, file: File) => Promise<void>,
    removeIntegratedScore: (cueId: string) => Promise<void>,
    getBlob: (storageKey: string) => Promise<Blob | null>,
}

export const useCueAttachmentsState = (
    scriptId: string | null,
    scriptRepository: ScriptRepository,
): CueAttachmentsState => {
    const attachments = useScriptAttachments(scriptId, scriptRepository);
    const integratedScoresByCue = useMemo(() => {
        const byCue = new Map<string, CueAttachmentRecord | null>();

        attachments.byCueRole.forEach((attachment, key) => {
            const [cueId, role] = key.split(':');

            if (cueId && role === INTEGRATED_SCORE_ROLE) {
                byCue.set(cueId, attachment);
            }
        });

        return byCue;
    }, [attachments.byCueRole]);
    const uploadIntegratedScore = useCallback((cueId: string, file: File) => {
        return attachments.upload(cueId, INTEGRATED_SCORE_ROLE, file);
    }, [attachments.upload]);
    const removeIntegratedScore = useCallback((cueId: string) => {
        return attachments.remove(cueId, INTEGRATED_SCORE_ROLE);
    }, [attachments.remove]);

    return {
        integratedScoresByCue,
        uploadingCueIds: attachments.uploadingCueIds,
        uploadIntegratedScore,
        removeIntegratedScore,
        getBlob: attachments.getBlob,
    };
};

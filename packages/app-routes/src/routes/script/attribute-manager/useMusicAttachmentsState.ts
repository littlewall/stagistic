import {
    type ScriptRepository,
    useScriptAttachments,
} from '@stagistic/app-core';
import {useCallback, useMemo} from 'react';

export const INTEGRATED_SCORE_ROLE = 'integrated_score';

export interface MusicAttachmentRecord {
    id: string,
    filename: string,
    sizeBytes: number,
    storageKey: string,
}

export interface MusicAttachmentsState {
    integratedScoresByMusic: Map<string, MusicAttachmentRecord | null>,
    uploadingMusicIds: Set<string>,
    uploadIntegratedScore: (musicId: string, file: File) => Promise<void>,
    removeIntegratedScore: (musicId: string) => Promise<void>,
    getBlob: (storageKey: string) => Promise<Blob | null>,
}

export const useMusicAttachmentsState = (
    scriptId: string | null,
    scriptRepository: ScriptRepository,
): MusicAttachmentsState => {
    const attachments = useScriptAttachments(scriptId, scriptRepository);
    const integratedScoresByMusic = useMemo(() => {
        const byMusic = new Map<string, MusicAttachmentRecord | null>();

        attachments.byMusicRole.forEach((attachment, key) => {
            const [musicId, role] = key.split(':');

            if (musicId && role === INTEGRATED_SCORE_ROLE) {
                byMusic.set(musicId, attachment);
            }
        });

        return byMusic;
    }, [attachments.byMusicRole]);
    const uploadIntegratedScore = useCallback((musicId: string, file: File) => {
        return attachments.upload(musicId, INTEGRATED_SCORE_ROLE, file);
    }, [attachments.upload]);
    const removeIntegratedScore = useCallback((musicId: string) => {
        return attachments.remove(musicId, INTEGRATED_SCORE_ROLE);
    }, [attachments.remove]);

    return {
        integratedScoresByMusic,
        uploadingMusicIds: attachments.uploadingMusicIds,
        uploadIntegratedScore,
        removeIntegratedScore,
        getBlob: attachments.getBlob,
    };
};

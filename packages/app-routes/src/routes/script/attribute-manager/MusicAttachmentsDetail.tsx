import {
    AttributeManagerMusicDetail,
    type MusicAttachmentSlotView,
    RemoveAttachmentModal,
} from '@stagistic/ui';
import {useRef, useState} from 'react';

import type {
    ScriptMusicListItem,
    UpdateScriptMusicInput,
} from '../editor/music/types';
import {MusicAttachmentPreviewModal} from './MusicAttachmentPreviewModal';
import {
    INTEGRATED_SCORE_ROLE,
    type useMusicAttachmentsState,
} from './useMusicAttachmentsState';

interface MusicAttachmentsDetailProps {
    music: ScriptMusicListItem,
    displayTitle?: string,
    state: ReturnType<typeof useMusicAttachmentsState>,
    onUpdateMusic: (musicId: string, input: UpdateScriptMusicInput) => unknown,
    onTitleDraftChange?: (title: string) => void,
}

export const MusicAttachmentsDetail = ({
    music,
    displayTitle = music.title,
    state,
    onUpdateMusic,
    onTitleDraftChange = () => undefined,
}: MusicAttachmentsDetailProps) => {
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [removeId, setRemoveId] = useState<string | null>(null);
    const previewTriggerRef = useRef<HTMLElement | null>(null);
    const removeTriggerRef = useRef<HTMLElement | null>(null);
    const musicId = music.id;
    const {
        integratedScoresByMusic,
        uploadingMusicIds,
        uploadIntegratedScore,
        removeIntegratedScore,
        getBlob,
    } = state;
    const integratedScore = integratedScoresByMusic.get(musicId) ?? null;

    const attachmentSlots: MusicAttachmentSlotView[] = [
        {
            id: INTEGRATED_SCORE_ROLE,
            label: 'Integrated score',
            attachment: integratedScore ? {
                id: integratedScore.id,
                filename: integratedScore.filename,
                sizeBytes: integratedScore.sizeBytes,
                isAvailable: true,
            } : null,
            isUploading: uploadingMusicIds.has(musicId),
        },
    ];
    const previewRow = integratedScore?.id === previewId ? integratedScore : null;
    const removeRow = integratedScore?.id === removeId ? integratedScore : null;

    return (
        <>
            <AttributeManagerMusicDetail
                musicId={music.id}
                musicTitle={displayTitle}
                confirmedMusicTitle={music.title}
                musicKind={music.kind}
                attachmentSlots={attachmentSlots}
                onUpdateMusic={input => onUpdateMusic(music.id, input)}
                onMusicTitleChange={onTitleDraftChange}
                onUploadPdf={(_slotId, file) => void uploadIntegratedScore(musicId, file)}
                onPreview={(attachmentId, trigger) => {
                    previewTriggerRef.current = trigger ?? null;
                    setPreviewId(attachmentId);
                }}
                onRemove={(_slotId, trigger) => {
                    removeTriggerRef.current = trigger ?? null;
                    setRemoveId(integratedScore?.id ?? null);
                }}
            />
            <MusicAttachmentPreviewModal
                returnFocus={previewTriggerRef}
                isOpen={previewRow !== null}
                attachmentName={previewRow?.filename ?? ''}
                storageKey={previewRow?.storageKey ?? null}
                loadBlob={getBlob}
                onClose={() => setPreviewId(null)}
            />
            <RemoveAttachmentModal
                returnFocus={removeTriggerRef}
                isOpen={removeRow !== null}
                attachmentName={removeRow?.filename ?? ''}
                onClose={() => setRemoveId(null)}
                onConfirm={async () => {
                    if (removeRow) {
                        await removeIntegratedScore(musicId);
                    }

                    setRemoveId(null);
                }}
            />
        </>
    );
};

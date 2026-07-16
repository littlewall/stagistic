import {
    AttributeManagerCueDetail, type CueAttachmentSlotView, RemoveAttachmentModal,
} from '@stagistic/ui';
import {useState} from 'react';

import type {
    ScriptCueListItem,
    UpdateScriptCueInput,
} from '../editor/cues/types';
import {CueAttachmentPreviewModal} from './CueAttachmentPreviewModal';
import {
    INTEGRATED_SCORE_ROLE, useCueAttachmentsState,
} from './useCueAttachmentsState';

interface CueAttachmentsDetailProps {
    cue: ScriptCueListItem,
    displayTitle?: string,
    state: ReturnType<typeof useCueAttachmentsState>,
    onUpdateCue: (cueId: string, input: UpdateScriptCueInput) => unknown,
    onTitleDraftChange?: (title: string) => void,
}

export const CueAttachmentsDetail = ({
    cue,
    displayTitle = cue.title,
    state,
    onUpdateCue,
    onTitleDraftChange = () => undefined,
}: CueAttachmentsDetailProps) => {
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [removeId, setRemoveId] = useState<string | null>(null);
    const cueId = cue.id;
    const {
        integratedScoresByCue,
        uploadingCueIds,
        uploadIntegratedScore,
        removeIntegratedScore,
        getBlob,
    } = state;
    const integratedScore = integratedScoresByCue.get(cueId) ?? null;

    const attachmentSlots: CueAttachmentSlotView[] = [
        {
            id: INTEGRATED_SCORE_ROLE,
            label: 'Integrated score',
            attachment: integratedScore ? {
                id: integratedScore.id,
                filename: integratedScore.filename,
                sizeBytes: integratedScore.sizeBytes,
                isAvailable: true,
            } : null,
            isUploading: uploadingCueIds.has(cueId),
        },
    ];
    const previewRow = integratedScore?.id === previewId ? integratedScore : null;
    const removeRow = integratedScore?.id === removeId ? integratedScore : null;

    return (
        <>
            <AttributeManagerCueDetail
                cueId={cue.id}
                cueTitle={displayTitle}
                confirmedCueTitle={cue.title}
                cueKind={cue.kind}
                attachmentSlots={attachmentSlots}
                onUpdateCue={input => onUpdateCue(cue.id, input)}
                onCueTitleChange={onTitleDraftChange}
                onUploadPdf={(_slotId, file) => void uploadIntegratedScore(cueId, file)}
                onPreview={setPreviewId}
                onRemove={() => setRemoveId(integratedScore?.id ?? null)}
            />
            <CueAttachmentPreviewModal
                isOpen={previewRow !== null}
                attachmentName={previewRow?.filename ?? ''}
                storageKey={previewRow?.storageKey ?? null}
                loadBlob={getBlob}
                onClose={() => setPreviewId(null)}
            />
            <RemoveAttachmentModal
                isOpen={removeRow !== null}
                attachmentName={removeRow?.filename ?? ''}
                onClose={() => setRemoveId(null)}
                onConfirm={async () => {
                    if (removeRow) {
                        await removeIntegratedScore(cueId);
                    }

                    setRemoveId(null);
                }}
            />
        </>
    );
};

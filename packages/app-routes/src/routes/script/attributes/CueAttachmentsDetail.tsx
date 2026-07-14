import {
    AttributeManagerCueDetail, type CueAttachmentSlotView, RemoveAttachmentModal,
} from '@stagistic/ui';
import {useEffect, useState} from 'react';

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
    state: ReturnType<typeof useCueAttachmentsState>,
    onUpdateCue: (cueId: string, input: UpdateScriptCueInput) => unknown,
}

export const CueAttachmentsDetail = ({
    cue,
    state,
    onUpdateCue,
}: CueAttachmentsDetailProps) => {
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [removeId, setRemoveId] = useState<string | null>(null);
    const cueId = cue.id;
    const {
        integratedScoresByCue,
        uploadingCueIds,
        loadCue,
        uploadIntegratedScore,
        removeIntegratedScore,
        getBlob,
    } = state;
    const integratedScore = integratedScoresByCue.get(cueId) ?? null;

    useEffect(() => {
        void loadCue(cueId);
    }, [cueId, loadCue]);

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
                cueTitle={cue.title}
                cueKind={cue.kind}
                attachmentSlots={attachmentSlots}
                onUpdateCue={input => onUpdateCue(cue.id, input)}
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

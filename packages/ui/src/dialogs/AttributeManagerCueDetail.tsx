import {
    type FormEvent,
    useRef,
} from 'react';

import {Button} from '../atoms/Button';
import {formControlStyles} from '../molecules/forms/formControlStyles';
import {
    FormSelect,
    type FormSelectOption,
} from '../molecules/forms/FormSelect';
import styles from './AttributeManagerCueDetail.module.css';

export type CueKind = 'song' | 'instrumental';

const CUE_KIND_OPTIONS: FormSelectOption[] = [{value: 'song', label: 'Song'}, {value: 'instrumental', label: 'Instrumental'}];

export interface CueAttachmentView {
    id: string,
    filename: string,
    sizeBytes: number,
    isAvailable: boolean,
}

export interface CueAttachmentSlotView {
    id: string,
    label: string,
    attachment: CueAttachmentView | null,
    isUploading: boolean,
}

export interface AttributeManagerCueDetailProps {
    cueId: string,
    cueTitle: string,
    confirmedCueTitle: string,
    cueKind: CueKind,
    attachmentSlots: CueAttachmentSlotView[],
    onUpdateCue: (input: {title: string, kind: CueKind}) => unknown,
    onCueTitleChange: (title: string) => void,
    onUploadPdf: (slotId: string, file: File) => void,
    onPreview: (attachmentId: string) => void,
    onRemove: (slotId: string) => void,
}

interface CueMetadataFieldsProps {
    cueId: string,
    cueTitle: string,
    confirmedCueTitle: string,
    cueKind: CueKind,
    onUpdateCue: AttributeManagerCueDetailProps['onUpdateCue'],
    onCueTitleChange: AttributeManagerCueDetailProps['onCueTitleChange'],
}

interface AttachmentSlotProps {
    slot: CueAttachmentSlotView,
    onUploadPdf: AttributeManagerCueDetailProps['onUploadPdf'],
    onPreview: AttributeManagerCueDetailProps['onPreview'],
    onRemove: AttributeManagerCueDetailProps['onRemove'],
}

const formatSize = (bytes: number): string => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kb = bytes / 1024;

    return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const CueMetadataFields = ({
    cueId,
    cueTitle,
    confirmedCueTitle,
    cueKind,
    onUpdateCue,
    onCueTitleChange,
}: CueMetadataFieldsProps) => {
    const persistTitle = () => {
        const title = cueTitle.trim();

        if (!title) {
            onCueTitleChange(confirmedCueTitle);

            return;
        }

        onCueTitleChange(title);

        if (title !== confirmedCueTitle) {
            void Promise.resolve(onUpdateCue({title, kind: cueKind})).catch(() => undefined);
        }
    };
    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        persistTitle();
    };

    return (
        <form className={styles.metadataForm} onSubmit={handleSubmit}>
            <div className={formControlStyles.field}>
                <label className={formControlStyles.label} htmlFor={`cue-name-${cueId}`}>
                    Name
                </label>
                <input
                    id={`cue-name-${cueId}`}
                    type="text"
                    className={formControlStyles.input}
                    value={cueTitle}
                    onChange={event => onCueTitleChange(event.target.value)}
                    onBlur={persistTitle}
                    onKeyDown={event => {
                        if (event.key === 'Escape') {
                            onCueTitleChange(confirmedCueTitle);
                            event.currentTarget.blur();
                        }
                    }}
                />
            </div>
            <div className={formControlStyles.field}>
                <label className={formControlStyles.label} htmlFor={`cue-kind-${cueId}`}>
                    Type
                </label>
                <FormSelect
                    id={`cue-kind-${cueId}`}
                    value={cueKind}
                    options={CUE_KIND_OPTIONS}
                    ariaLabel="Cue type"
                    onChange={value => {
                        const kind = value === 'instrumental' ? 'instrumental' : 'song';

                        if (kind !== cueKind) {
                            void Promise.resolve(onUpdateCue({
                                title: cueTitle.trim() || confirmedCueTitle,
                                kind,
                            })).catch(() => undefined);
                        }
                    }}
                />
            </div>
        </form>
    );
};

const AttachmentSlot = ({
    slot,
    onUploadPdf,
    onPreview,
    onRemove,
}: AttachmentSlotProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const {attachment} = slot;

    return (
        <li className={styles.slot}>
            <div className={styles.slotContent}>
                <h4 className={styles.slotLabel}>{slot.label}</h4>
                {attachment ? (
                    <div className={styles.attachmentMeta}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={styles.fileButton}
                            isDisabled={!attachment.isAvailable}
                            onPress={() => onPreview(attachment.id)}
                        >
                            {attachment.filename}
                        </Button>
                        <span className={styles.fileSize}>
                            {attachment.isAvailable ? formatSize(attachment.sizeBytes) : 'unavailable'}
                        </span>
                    </div>
                ) : (
                    <p className={styles.empty}>No PDF uploaded.</p>
                )}
            </div>
            <div className={styles.actions}>
                <Button
                    variant="secondary"
                    size="sm"
                    isPending={slot.isUploading}
                    onPress={() => inputRef.current?.click()}
                >
                    {attachment ? 'Replace PDF' : 'Upload PDF'}
                </Button>
                {attachment ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => onRemove(slot.id)}
                    >
                        Remove
                    </Button>
                ) : null}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className={styles.hiddenInput}
                onChange={event => {
                    const file = event.target.files?.[0];

                    if (file?.type === 'application/pdf') {
                        onUploadPdf(slot.id, file);
                    }

                    event.target.value = '';
                }}
            />
        </li>
    );
};

export const AttributeManagerCueDetail = ({
    cueId,
    cueTitle,
    confirmedCueTitle,
    cueKind,
    attachmentSlots,
    onUpdateCue,
    onCueTitleChange,
    onUploadPdf,
    onPreview,
    onRemove,
}: AttributeManagerCueDetailProps) => (
    <section>
        <CueMetadataFields
            cueId={cueId}
            cueTitle={cueTitle}
            confirmedCueTitle={confirmedCueTitle}
            cueKind={cueKind}
            onUpdateCue={onUpdateCue}
            onCueTitleChange={onCueTitleChange}
        />
        <ul className={styles.slots}>
            {attachmentSlots.map(slot => (
                <AttachmentSlot
                    key={slot.id}
                    slot={slot}
                    onUploadPdf={onUploadPdf}
                    onPreview={onPreview}
                    onRemove={onRemove}
                />
            ))}
        </ul>
    </section>
);

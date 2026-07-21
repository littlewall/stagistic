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
import styles from './AttributeManagerMusicDetail.module.css';

export type MusicKind = 'song' | 'instrumental';

const MUSIC_KIND_OPTIONS: FormSelectOption[] = [{value: 'song', label: 'Song'}, {value: 'instrumental', label: 'Instrumental'}];

export interface MusicAttachmentView {
    id: string,
    filename: string,
    sizeBytes: number,
    isAvailable: boolean,
}

export interface MusicAttachmentSlotView {
    id: string,
    label: string,
    attachment: MusicAttachmentView | null,
    isUploading: boolean,
}

export interface AttributeManagerMusicDetailProps {
    musicId: string,
    musicTitle: string,
    confirmedMusicTitle: string,
    musicKind: MusicKind,
    attachmentSlots: MusicAttachmentSlotView[],
    onUpdateMusic: (input: {title: string, kind: MusicKind}) => unknown,
    onMusicTitleChange: (title: string) => void,
    onUploadPdf: (slotId: string, file: File) => void,
    onPreview: (attachmentId: string) => void,
    onRemove: (slotId: string) => void,
}

interface MusicMetadataFieldsProps {
    musicId: string,
    musicTitle: string,
    confirmedMusicTitle: string,
    musicKind: MusicKind,
    onUpdateMusic: AttributeManagerMusicDetailProps['onUpdateMusic'],
    onMusicTitleChange: AttributeManagerMusicDetailProps['onMusicTitleChange'],
}

interface AttachmentSlotProps {
    slot: MusicAttachmentSlotView,
    onUploadPdf: AttributeManagerMusicDetailProps['onUploadPdf'],
    onPreview: AttributeManagerMusicDetailProps['onPreview'],
    onRemove: AttributeManagerMusicDetailProps['onRemove'],
}

const formatSize = (bytes: number): string => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kb = bytes / 1024;

    return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const MusicMetadataFields = ({
    musicId,
    musicTitle,
    confirmedMusicTitle,
    musicKind,
    onUpdateMusic,
    onMusicTitleChange,
}: MusicMetadataFieldsProps) => {
    const persistTitle = () => {
        const title = musicTitle.trim();

        if (!title) {
            onMusicTitleChange(confirmedMusicTitle);

            return;
        }

        onMusicTitleChange(title);

        if (title !== confirmedMusicTitle) {
            void Promise.resolve(onUpdateMusic({title, kind: musicKind})).catch(() => undefined);
        }
    };
    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        persistTitle();
    };

    return (
        <form className={styles.metadataForm} onSubmit={handleSubmit}>
            <div className={formControlStyles.field}>
                <label className={formControlStyles.label} htmlFor={`music-name-${musicId}`}>
                    Name
                </label>
                <input
                    id={`music-name-${musicId}`}
                    type="text"
                    className={formControlStyles.input}
                    value={musicTitle}
                    onChange={event => onMusicTitleChange(event.target.value)}
                    onBlur={persistTitle}
                    onKeyDown={event => {
                        if (event.key === 'Escape') {
                            onMusicTitleChange(confirmedMusicTitle);
                            event.currentTarget.blur();
                        }
                    }}
                />
            </div>
            <div className={formControlStyles.field}>
                <label className={formControlStyles.label} htmlFor={`music-kind-${musicId}`}>
                    Type
                </label>
                <FormSelect
                    id={`music-kind-${musicId}`}
                    value={musicKind}
                    options={MUSIC_KIND_OPTIONS}
                    ariaLabel="Music type"
                    onChange={value => {
                        const kind = value === 'instrumental' ? 'instrumental' : 'song';

                        if (kind !== musicKind) {
                            void Promise.resolve(onUpdateMusic({
                                title: musicTitle.trim() || confirmedMusicTitle,
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

export const AttributeManagerMusicDetail = ({
    musicId,
    musicTitle,
    confirmedMusicTitle,
    musicKind,
    attachmentSlots,
    onUpdateMusic,
    onMusicTitleChange,
    onUploadPdf,
    onPreview,
    onRemove,
}: AttributeManagerMusicDetailProps) => (
    <section>
        <MusicMetadataFields
            musicId={musicId}
            musicTitle={musicTitle}
            confirmedMusicTitle={confirmedMusicTitle}
            musicKind={musicKind}
            onUpdateMusic={onUpdateMusic}
            onMusicTitleChange={onMusicTitleChange}
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

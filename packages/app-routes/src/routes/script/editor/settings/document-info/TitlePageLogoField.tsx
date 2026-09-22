import type {TitlePageLogo, TitlePageLogoMimeType} from '@stagistic/script';
import {Button, Notice} from '@stagistic/ui';
import {type ChangeEvent, useRef, useState} from 'react';

import styles from './TitlePageLogoField.module.css';

export const TITLE_PAGE_LOGO_MAX_BYTES = 2 * 1024 * 1024;

const SUPPORTED_MIME_TYPES: TitlePageLogoMimeType[] = ['image/jpeg', 'image/png'];

const isSupportedMimeType = (value: string): value is TitlePageLogoMimeType => SUPPORTED_MIME_TYPES.includes(value as TitlePageLogoMimeType);

export const validateTitlePageLogoFile = ({size, type}: Pick<File, 'size' | 'type'>): string | null => {
    if (!isSupportedMimeType(type)) {
        return 'Choose a PNG or JPEG image.';
    }

    if (size > TITLE_PAGE_LOGO_MAX_BYTES) {
        return 'The image must be 2 MB or smaller.';
    }

    return null;
};

const readDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener('load', () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }

            reject(new Error('The selected image could not be read.'));
        });
        reader.addEventListener('error', () => reject(new Error('The selected image could not be read.')));
        reader.readAsDataURL(file);
    });

const readImageDimensions = (dataUrl: string) =>
    new Promise<{widthPx: number; heightPx: number}>((resolve, reject) => {
        const image = new Image();

        image.addEventListener('load', () => resolve({widthPx: image.naturalWidth, heightPx: image.naturalHeight}));
        image.addEventListener('error', () => reject(new Error('The selected file is not a valid image.')));
        image.src = dataUrl;
    });

interface TitlePageLogoFieldProps {
    logo?: TitlePageLogo;
    onChange: (logo: TitlePageLogo | undefined) => void;
}

export const TitlePageLogoField = ({logo, onChange}: TitlePageLogoFieldProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        event.target.value = '';
        if (!file) {
            return;
        }

        const validationError = validateTitlePageLogoFile(file);

        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            const dataUrl = await readDataUrl(file);
            const dimensions = await readImageDimensions(dataUrl);

            setError(null);
            onChange({
                dataUrl,
                filename: file.name,
                mimeType: file.type as TitlePageLogoMimeType,
                widthPx: dimensions.widthPx,
                heightPx: dimensions.heightPx,
                sizeBytes: file.size,
            });
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'The selected image could not be read.');
        }
    };

    return (
        <div className={styles.field}>
            <span className={styles.label}>Logo</span>
            {logo && (
                <div className={styles.preview}>
                    <img src={logo.dataUrl} alt={`Preview of ${logo.filename}`} />
                    <div className={styles.fileDetails}>
                        <span>{logo.filename}</span>
                        <span>{Math.ceil(logo.sizeBytes / 1024)} KB</span>
                    </div>
                </div>
            )}
            <div className={styles.actions}>
                <input
                    ref={inputRef}
                    className={styles.fileInput}
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    aria-label="Choose title page logo"
                    onChange={handleFileChange}
                />
                <Button variant="secondary" size="sm" onPress={() => inputRef.current?.click()}>
                    {logo ? 'Replace image' : 'Upload image'}
                </Button>
                {logo && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                            setError(null);
                            onChange(undefined);
                        }}
                    >
                        Remove
                    </Button>
                )}
            </div>
            <span className={styles.hint}>PNG or JPEG, up to 2 MB. Shown above the title in exports.</span>
            {error && <Notice variant="error">{error}</Notice>}
        </div>
    );
};

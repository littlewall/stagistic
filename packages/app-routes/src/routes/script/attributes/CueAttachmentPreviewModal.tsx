import {ModalDialog, ProgressCircle} from '@stagistic/ui';
import {
    useEffect, useRef, useState,
} from 'react';

import {renderPdfToCanvases} from '../export/renderPdfToCanvases';
import styles from './CueAttachmentPreviewModal.module.css';

export interface CueAttachmentPreviewModalProps {
    isOpen: boolean,
    attachmentName: string,
    storageKey: string | null,
    loadBlob: (storageKey: string) => Promise<Blob | null>,
    onClose: () => void,
}

type PreviewStatus = 'loading' | 'ready' | 'missing' | 'error';

export const CueAttachmentPreviewModal = ({
    isOpen,
    attachmentName,
    storageKey,
    loadBlob,
    onClose,
}: CueAttachmentPreviewModalProps) => {
    const pagesRef = useRef<HTMLDivElement | null>(null);
    const [status, setStatus] = useState<PreviewStatus>('loading');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let cancelled = false;

        pagesRef.current?.replaceChildren();
        setStatus('loading');

        const render = async () => {
            if (!storageKey) {
                setStatus('missing');

                return;
            }

            const blob = await loadBlob(storageKey);

            if (cancelled) {
                return;
            }

            if (!blob) {
                setStatus('missing');

                return;
            }

            const canvases = await renderPdfToCanvases(await blob.arrayBuffer(), 1);

            if (cancelled || !pagesRef.current) {
                return;
            }

            pagesRef.current.replaceChildren(...canvases.map(canvas => {
                const frame = document.createElement('div');

                frame.className = styles.page;
                canvas.style.width = '100%';
                canvas.style.height = 'auto';
                frame.append(canvas);

                return frame;
            }));
            setStatus('ready');
        };

        void render().catch(error => {
            if (!cancelled) {
                console.error('[attachments] PDF preview failed', error);
                setStatus('error');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        isOpen,
        loadBlob,
        storageKey,
    ]);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel={`Preview ${attachmentName}`}
        >
            <header className={styles.header}>
                <h2 className={styles.title}>{attachmentName}</h2>
            </header>
            <div className={styles.body}>
                <div
                    className={styles.pages}
                    ref={pagesRef}
                    aria-busy={status === 'loading'}
                />
                {status === 'loading' ? (
                    <div className={styles.overlay} role="status">
                        <ProgressCircle aria-label="Loading preview" isIndeterminate />
                    </div>
                ) : null}
                {status === 'missing' ? (
                    <p className={styles.message}>This attachment is not available in this browser.</p>
                ) : null}
                {status === 'error' ? (
                    <p className={styles.message} role="alert">Preview failed.</p>
                ) : null}
            </div>
        </ModalDialog>
    );
};

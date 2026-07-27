import {ProgressCircle} from '@stagistic/ui';
import {
    useEffect,
    useRef,
    useState,
} from 'react';

import styles from './ExportPreview.module.css';
import {DEFAULT_EXPORT_PREVIEW_ZOOM} from './exportPreviewZoom';
import {useExportContext} from './ExportProvider';
import {renderPdfToCanvases} from './renderPdfToCanvases';

export const ExportPreview = () => {
    const {artifact, status} = useExportContext();
    const pagesRef = useRef<HTMLDivElement | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [isRenderingPreview, setIsRenderingPreview] = useState(false);
    const [renderedArtifact, setRenderedArtifact] = useState<Blob | null>(null);
    const [zoom, setZoom] = useState(DEFAULT_EXPORT_PREVIEW_ZOOM);
    const isBusy = status === 'regenerating' || isRenderingPreview || artifact !== renderedArtifact;
    const busyLabel = pageCount > 0 ? 'Updating preview' : 'Preparing preview';

    useEffect(() => {
        if (!artifact || !pagesRef.current) {
            setIsRenderingPreview(false);
            setRenderedArtifact(null);

            return;
        }

        let cancelled = false;

        setIsRenderingPreview(true);

        const render = async () => {
            const data = await artifact.arrayBuffer();
            const canvases = await renderPdfToCanvases(data, zoom);

            if (cancelled || !pagesRef.current) {
                return;
            }

            pagesRef.current.replaceChildren(...canvases.map(canvas => {
                const frame = document.createElement('div');

                frame.className = styles.page;
                frame.style.width = canvas.style.width;
                frame.style.height = canvas.style.height;
                frame.append(canvas);

                return frame;
            }));
            setPageCount(canvases.length);
            setRenderedArtifact(artifact);
            setIsRenderingPreview(false);
        };

        void render().catch(() => {
            if (!cancelled) {
                setPageCount(0);
                setRenderedArtifact(artifact);
                setIsRenderingPreview(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [artifact, zoom]);

    return (
        <section
            className={styles.preview}
            aria-label="PDF preview"
            aria-busy={isBusy}
        >
            <div className={styles.toolbar}>
                <span>{pageCount > 0 ? `${pageCount} pages` : 'No preview'}</span>
                <div className={styles.zoomControls}>
                    <button type="button" onClick={() => setZoom(value => Math.max(0.5, value - 0.1))}>-</button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button type="button" onClick={() => setZoom(value => Math.min(1.5, value + 0.1))}>+</button>
                </div>
            </div>
            <div className={styles.pages} ref={pagesRef}>
                {!artifact ? <div className={styles.empty}>Preview will appear here.</div> : null}
            </div>
            {isBusy ? (
                <div
                    className={styles.overlay}
                    role="status"
                    aria-live="polite"
                >
                    <div className={styles.busyPanel}>
                        <ProgressCircle aria-label={busyLabel} isIndeterminate />
                        <span>{busyLabel}</span>
                    </div>
                </div>
            ) : null}
            {status === 'error' ? (
                <div className={styles.error} role="alert">Export preview failed.</div>
            ) : null}
        </section>
    );
};

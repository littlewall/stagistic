import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {
    useEffect,
    useRef,
    useState,
} from 'react';

import styles from './ExportPreview.module.css';
import {useExportContext} from './ExportProvider';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const renderPage = async (
    page: pdfjs.PDFPageProxy,
    scale: number,
): Promise<HTMLCanvasElement> => {
    const viewport = page.getViewport({scale});
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas context unavailable');
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    await page.render({
        canvas,
        canvasContext: context,
        viewport,
    }).promise;

    return canvas;
};

export const ExportPreview = () => {
    const {artifact, status} = useExportContext();
    const pagesRef = useRef<HTMLDivElement | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [zoom, setZoom] = useState(0.9);

    useEffect(() => {
        if (!artifact || !pagesRef.current) {
            return;
        }

        let cancelled = false;

        const render = async () => {
            const data = await artifact.arrayBuffer();
            const documentTask = pdfjs.getDocument({data});
            const pdf = await documentTask.promise;
            const canvases: HTMLCanvasElement[] = [];

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                const page = await pdf.getPage(pageNumber);

                canvases.push(await renderPage(page, zoom));
            }

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
            setPageCount(pdf.numPages);
        };

        void render().catch(() => {
            if (!cancelled) {
                setPageCount(0);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [artifact, zoom]);

    return (
        <section className={styles.preview} aria-label="PDF preview">
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
            {status === 'regenerating' ? (
                <div className={styles.overlay}>Regenerating</div>
            ) : null}
            {status === 'error' ? (
                <div className={styles.error} role="alert">Export preview failed.</div>
            ) : null}
        </section>
    );
};

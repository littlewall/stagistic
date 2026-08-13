import {
    ArrowLeftIcon,
    ArrowRightIcon,
    Button,
    Input,
    ProgressCircle,
} from '@stagistic/ui';
import {
    useEffect,
    useRef,
    useState,
} from 'react';

import {ExportDownloadButton} from './ExportDownloadButton';
import styles from './ExportPreview.module.css';
import {DEFAULT_EXPORT_PREVIEW_ZOOM} from './exportPreviewZoom';
import {useExportContext} from './ExportProvider';
import {renderPdfToCanvases} from './renderPdfToCanvases';

export const ExportPreview = () => {
    const {
        artifact,
        canExport,
        status,
    } = useExportContext();
    const pagesRef = useRef<HTMLDivElement | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageNumberInput, setPageNumberInput] = useState('');
    const [isRenderingPreview, setIsRenderingPreview] = useState(false);
    const [renderedArtifact, setRenderedArtifact] = useState<Blob | null>(null);
    const [zoom, setZoom] = useState(DEFAULT_EXPORT_PREVIEW_ZOOM);
    const isBusy = canExport
        && (status === 'regenerating' || isRenderingPreview || artifact !== renderedArtifact);
    const busyLabel = pageCount > 0 ? 'Updating preview' : 'Preparing preview';

    useEffect(() => {
        if (!canExport || !artifact || !pagesRef.current) {
            setIsRenderingPreview(false);
            setRenderedArtifact(null);
            setPageCount(0);
            setCurrentPage(1);

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
            setCurrentPage(page => Math.min(page, Math.max(canvases.length, 1)));
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
    }, [
        artifact,
        canExport,
        zoom,
    ]);

    useEffect(() => {
        setPageNumberInput(pageCount > 0 ? String(currentPage) : '');
    }, [currentPage, pageCount]);

    const goToPage = (requestedPage: number) => {
        if (pageCount === 0) {
            return;
        }

        const pageNumber = Math.min(
            pageCount,
            Math.max(1, Math.trunc(requestedPage)),
        );
        const page = pagesRef.current?.children.item(pageNumber - 1);

        if (!(page instanceof HTMLElement)) {
            return;
        }

        page.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        setCurrentPage(pageNumber);
        setPageNumberInput(String(pageNumber));
    };

    const commitPageNumberInput = (value: string) => {
        const requestedPage = Number.parseInt(value, 10);

        goToPage(Number.isFinite(requestedPage) ? requestedPage : currentPage);
    };

    const syncCurrentPage = () => {
        const pages = pagesRef.current;

        if (!pages) {
            return;
        }

        const previewBounds = pages.getBoundingClientRect();
        let visiblePage = currentPage;
        let visibleHeight = 0;

        Array.from(pages.children).forEach((page, index) => {
            const pageBounds = page.getBoundingClientRect();
            const intersectionHeight = Math.max(
                0,
                Math.min(pageBounds.bottom, previewBounds.bottom)
                    - Math.max(pageBounds.top, previewBounds.top),
            );

            if (intersectionHeight > visibleHeight) {
                visiblePage = index + 1;
                visibleHeight = intersectionHeight;
            }
        });

        if (visibleHeight > 0) {
            setCurrentPage(visiblePage);
        }
    };

    return (
        <section
            className={styles.preview}
            aria-label="PDF preview"
            aria-busy={isBusy}
        >
            <div className={styles.toolbar}>
                <h2 className={styles.heading}>PDF preview</h2>
                <div
                    className={styles.zoomControls}
                    role="group"
                    aria-label="Preview zoom"
                >
                    <button
                        type="button"
                        aria-label="Zoom out"
                        disabled={!canExport || pageCount === 0}
                        onClick={() => setZoom(value => Math.max(0.5, value - 0.1))}
                    >
                        -
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                        type="button"
                        aria-label="Zoom in"
                        disabled={!canExport || pageCount === 0}
                        onClick={() => setZoom(value => Math.min(1.5, value + 0.1))}
                    >
                        +
                    </button>
                </div>
                <div
                    className={styles.pageControls}
                    role="group"
                    aria-label="Preview page navigation"
                >
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={styles.toolbarButton}
                        aria-label="Previous page"
                        isDisabled={pageCount === 0 || currentPage === 1}
                        onPress={() => goToPage(currentPage - 1)}
                    >
                        <ArrowLeftIcon aria-hidden="true" />
                    </Button>
                    <div className={styles.pageIndicator}>
                        <span>Page</span>
                        <Input
                            className={styles.pageNumberInput}
                            type="number"
                            min={1}
                            max={Math.max(pageCount, 1)}
                            step={1}
                            aria-label="Page number"
                            disabled={pageCount === 0}
                            placeholder="–"
                            value={pageNumberInput}
                            onChange={event => setPageNumberInput(event.currentTarget.value)}
                            onBlur={event => commitPageNumberInput(event.currentTarget.value)}
                            onKeyDown={event => {
                                if (event.key !== 'Enter') {
                                    return;
                                }

                                event.preventDefault();
                                commitPageNumberInput(event.currentTarget.value);
                            }}
                        />
                        <span aria-live="polite">
                            / {pageCount > 0 ? pageCount : '–'}
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={styles.toolbarButton}
                        aria-label="Next page"
                        isDisabled={pageCount === 0 || currentPage === pageCount}
                        onPress={() => goToPage(currentPage + 1)}
                    >
                        <ArrowRightIcon aria-hidden="true" />
                    </Button>
                </div>
                <div className={styles.toolbarActions}>
                    <ExportDownloadButton />
                </div>
            </div>
            <div
                className={styles.pages}
                ref={pagesRef}
                onScroll={syncCurrentPage}
            >
                {!canExport ? (
                    <div className={styles.empty}>
                        Add script content to generate a PDF preview.
                    </div>
                ) : !artifact ? (
                    <div className={styles.empty}>Preview will appear here.</div>
                ) : null}
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
            {canExport && status === 'error' ? (
                <div className={styles.error} role="alert">Export preview failed.</div>
            ) : null}
        </section>
    );
};

import type {TranscriptResult} from '../model/visualLine';
import {PdfFileLoadError} from './pdfFileLoadError';

type WorkerResponse = {type: 'DONE', blob: Blob} | {
    type: 'ERROR',
    message: string,
    fileFailure?: boolean,
};

export const renderPdfInWorker = (
    transcript: TranscriptResult,
    signal?: AbortSignal,
): Promise<Blob> => new Promise((resolve, reject) => {
    if (signal?.aborted) {
        reject(new DOMException('Export aborted', 'AbortError'));

        return;
    }

    const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), {type: 'module'});

    const cleanup = () => {
        signal?.removeEventListener('abort', handleAbort);
        worker.terminate();
    };
    const handleAbort = () => {
        cleanup();
        reject(new DOMException('Export aborted', 'AbortError'));
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        cleanup();

        if (event.data.type === 'ERROR') {
            reject(event.data.fileFailure ? new PdfFileLoadError(event.data.message) : new Error(event.data.message));

            return;
        }

        resolve(event.data.blob);
    };
    worker.onerror = event => {
        cleanup();
        // The worker file itself failed to load (or threw while starting).
        reject(new PdfFileLoadError(event.message));
    };

    signal?.addEventListener('abort', handleAbort, {once: true});
    worker.postMessage({
        type: 'START',
        transcript,
    });
});

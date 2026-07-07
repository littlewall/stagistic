import type {TranscriptResult} from '../visualLine';

type WorkerResponse = {type: 'DONE', blob: Blob} | {type: 'ERROR', message: string};

export const renderPdfInWorker = (
    transcript: TranscriptResult,
    opts: {blankPagesBeforeScript: number},
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
            reject(new Error(event.data.message));
            return;
        }

        resolve(event.data.blob);
    };
    worker.onerror = event => {
        cleanup();
        reject(new Error(event.message));
    };

    signal?.addEventListener('abort', handleAbort, {once: true});
    worker.postMessage({
        type: 'START',
        transcript,
        blankPagesBeforeScript: opts.blankPagesBeforeScript,
    });
});

/*
 * A file the running build loads late (a worker, a lazy chunk) can be gone after
 * a deploy. The host serves an HTML page for it, so the failure looks like a
 * hang or a vague error. Whoever loads such a file reports the failure here and
 * the app offers a reload.
 */
let failure: string | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(listener => listener());

/** The first report wins until it is dismissed; later ones add nothing a writer could act on. */
export const reportRuntimeFileFailure = (description: string) => {
    if (failure !== null) {
        return;
    }

    failure = description;
    notify();
};

export const dismissRuntimeFileFailure = () => {
    if (failure === null) {
        return;
    }

    failure = null;
    notify();
};

export const getRuntimeFileFailure = () => failure;

export const subscribeRuntimeFileFailure = (listener: () => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

interface GuardOptions {
    /** Shown to the writer when the work fails or does not answer. */
    description: string,
    /** A file served as HTML may never answer; this bounds the wait. */
    timeoutMs: number,
}

/** Reports a failure of `work`, or its silence past the timeout, and still rejects so the caller handles it too. */
export const guardRuntimeFile = <T>(work: Promise<T>, {description, timeoutMs}: GuardOptions): Promise<T> => new Promise<T>((resolve, reject) => {
    let settled = false;
    // A work rejection arriving after the timeout must not re-report (it would reopen a dismissed prompt).
    const finish = <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
        if (settled) {
            return;
        }

        settled = true;
        clearTimeout(timer);
        fn(...args);
    };
    const timer = setTimeout(() => {
        reportRuntimeFileFailure(description);
        finish(() => reject(new Error(`${description} The file did not answer within ${timeoutMs} ms.`)))();
    }, timeoutMs);

    work.then(
        finish(resolve),
        finish((error: unknown) => {
            reportRuntimeFileFailure(description);
            reject(error instanceof Error ? error : new Error(description, {cause: error}));
        }),
    );
});

const DYNAMIC_IMPORT_FAILURE = /dynamically imported module|Importing a module script failed/i;

// pdfjs wraps a failed import of its worker file in a plain Error once it falls back to a fake worker.
const PDFJS_WORKER_FAILURE = /Setting up fake worker failed/i;

/** Chrome, Firefox and Safari word a failed `import()` differently; all of them are TypeErrors. pdfjs's worker fallback is the one plain Error. */
export const isDynamicImportFailure = (error: unknown) => (error instanceof TypeError && DYNAMIC_IMPORT_FAILURE.test(error.message))
    || (error instanceof Error && PDFJS_WORKER_FAILURE.test(error.message));

/** For a catch around `import()`: a chunk the host no longer has asks for a reload, any other error is left to the caller. */
export const reportDynamicImportFailure = (error: unknown, description: string) => {
    if (isDynamicImportFailure(error)) {
        reportRuntimeFileFailure(description);
    }
};

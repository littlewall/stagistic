/**
 * TEMPORARY perf instrumentation for the view-switching investigation.
 * Logs `[perf]` lines to the console. Delete after the investigation.
 */

const SWITCH_MARK = 'view-switch';

export const markViewSwitch = (view: string) => {
    performance.mark(SWITCH_MARK);
    // eslint-disable-next-line no-console
    console.log(`[perf] switch requested → ${view}`);
};

const sinceSwitchMs = (): number | null => {
    const entries = performance.getEntriesByName(SWITCH_MARK, 'mark');
    const last = entries[entries.length - 1];

    if (!last) {
        return null;
    }

    return performance.now() - last.startTime;
};

const logSinceSwitch = (label: string) => {
    const elapsed = sinceSwitchMs();

    // eslint-disable-next-line no-console
    console.log(`[perf] ${label}: ${elapsed === null ? 'n/a (no switch mark)' : `${Math.round(elapsed)}ms after switch`}`);
};

/** Call from a mount effect: logs commit time and then polls until pagination settles. */
export const reportEditorMountPerf = () => {
    logSinceSwitch('editor route committed');

    const start = performance.now();
    let previousDividers = -1;
    let stableSince: number | null = null;

    const poll = () => {
        if (performance.now() - start > 15_000) {
            logSinceSwitch('pagination poll timed out');

            return;
        }

        const editorReady = document.querySelector('[contenteditable="true"]') !== null;
        const dividers = document.querySelectorAll('[data-pagination-divider="true"]').length;

        if (editorReady && dividers === previousDividers) {
            if (stableSince === null) {
                stableSince = performance.now();
            } else if (performance.now() - stableSince > 300) {
                logSinceSwitch(`editor visible + pagination stable (${dividers} dividers)`);

                return;
            }
        } else {
            stableSince = null;
        }

        previousDividers = dividers;
        window.setTimeout(poll, 50);
    };

    poll();
};

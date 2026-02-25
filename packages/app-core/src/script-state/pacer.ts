import {LiteDebouncer} from '@tanstack/pacer-lite/lite-debouncer';

type TimeoutHandle = ReturnType<typeof setTimeout>;

export interface ScriptStatePacerOptions {
    waitMs?: number,
    maxWaitMs?: number,
    onFlush: () => Promise<void> | void,
}

const DEFAULT_WAIT_MS = 400;
const DEFAULT_MAX_WAIT_MS = 2000;

export class ScriptStatePacer {
    private readonly waitMs: number;

    private readonly maxWaitMs: number;

    private readonly onFlush: () => Promise<void> | void;

    private readonly debouncer: LiteDebouncer<() => void>;

    private hasPendingWork = false;

    private maxWaitTimer: TimeoutHandle | null = null;

    private isFlushing = false;

    constructor(options: ScriptStatePacerOptions) {
        this.waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
        this.maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
        this.onFlush = options.onFlush;
        this.debouncer = new LiteDebouncer(() => {
            void this.flushInternal();
        }, {
            wait: this.waitMs,
            trailing: true,
            leading: false,
        });
    }

    schedule() {
        this.hasPendingWork = true;
        this.debouncer.maybeExecute();

        if (this.maxWaitTimer !== null) {
            return;
        }

        this.maxWaitTimer = setTimeout(() => {
            this.maxWaitTimer = null;
            void this.flushInternal();
        }, this.maxWaitMs);
    }

    async flushNow() {
        await this.flushInternal();
    }

    cancel() {
        this.hasPendingWork = false;
        this.debouncer.cancel();
        this.clearMaxWaitTimer();
    }

    private clearMaxWaitTimer() {
        if (this.maxWaitTimer === null) {
            return;
        }

        clearTimeout(this.maxWaitTimer);
        this.maxWaitTimer = null;
    }

    private async flushInternal() {
        if (!this.hasPendingWork) {
            return;
        }

        if (this.isFlushing) {
            return;
        }

        this.isFlushing = true;
        this.hasPendingWork = false;
        this.debouncer.cancel();
        this.clearMaxWaitTimer();

        try {
            await this.onFlush();
        } finally {
            this.isFlushing = false;

            if (this.hasPendingWork) {
                this.schedule();
            }
        }
    }
}

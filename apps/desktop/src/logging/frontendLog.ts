import {invoke} from '@tauri-apps/api/core';

// tauri-plugin-log's LogLevel numbering.
const LEVEL_ERROR = 5;
const MAX_LENGTH = 500;

const describeValue = (value: unknown): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (value instanceof Error) {
        return `${value.name}: ${value.message}`;
    }

    return typeof value === 'object' && value !== null ? '[object]' : `[${typeof value}]`;
};

/*
 * One log line from console.error arguments. Objects are never dumped so
 * script content held in application state cannot reach the log file.
 */
export const describeLogArgs = (args: unknown[]): string => {
    const text = args.map(describeValue).join(' ');

    return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text;
};

interface ErrorLogHost {
    console: {error: (...args: unknown[]) => void},
    target: EventTarget,
    send: (message: string) => Promise<unknown> | void,
}

/** Routes console.error, unhandled errors and rejections to `send`; returns an uninstaller. */
export const installFrontendErrorLog = (host: ErrorLogHost): () => void => {
    const original = host.console.error;
    const send = (message: string) => {
        try {
            void Promise.resolve(host.send(message)).catch(() => undefined);
        } catch {
            // Logging must never break the app.
        }
    };
    const onError = (event: Event) => {
        send(`Unhandled error: ${describeLogArgs([(event as ErrorEvent).message])}`);
    };
    const onRejection = (event: Event) => {
        send(`Unhandled rejection: ${describeLogArgs([(event as PromiseRejectionEvent).reason])}`);
    };

    host.console.error = (...args: unknown[]) => {
        original.apply(host.console, args);
        send(describeLogArgs(args));
    };
    host.target.addEventListener('error', onError);
    host.target.addEventListener('unhandledrejection', onRejection);

    return () => {
        host.console.error = original;
        host.target.removeEventListener('error', onError);
        host.target.removeEventListener('unhandledrejection', onRejection);
    };
};

/** Frontend errors land in the same log file as Rust errors (tauri-plugin-log). */
export const sendToLog = (message: string) => invoke('plugin:log|log', {
    level: LEVEL_ERROR,
    message,
    location: 'frontend',
});

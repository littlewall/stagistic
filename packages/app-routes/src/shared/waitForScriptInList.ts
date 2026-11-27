import type {ScriptRepository} from '@stagistic/app-core';

const SCRIPT_LIST_TIMEOUT_MS = 3_000;

/*
 * The editor route redirects away from a script id the script list does not
 * know yet, so a freshly created script must reach the list before we open it.
 */
export const waitForScriptInList = async (repository: ScriptRepository, scriptId: string) => {
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        await new Promise<void>(resolve => {
            timer = setTimeout(resolve, SCRIPT_LIST_TIMEOUT_MS);
            void repository.scriptSummaries.subscribe(rows => {
                if (rows.some(row => row.id === scriptId)) {
                    resolve();
                }
            }).then(cleanup => {
                unsubscribe = cleanup;
            });
        });
    } finally {
        clearTimeout(timer);
        unsubscribe?.();
    }
};

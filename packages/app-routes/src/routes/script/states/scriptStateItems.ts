import {
    getScriptSnapshotLabel,
    getScriptSnapshotOrigin,
    type ScriptRepository,
    type ScriptSnapshot,
} from '@stagistic/app-core';
import type {ScriptStateMenuItem, ScriptStateRecord} from '@stagistic/ui';

const dateFormat = new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeStyle: 'short'});

const formatSnapshotDate = (timestamp: number) => dateFormat.format(new Date(timestamp));

const describeSnapshot = (snapshot: ScriptSnapshot) => {
    return [
        getScriptSnapshotOrigin(snapshot),
        formatSnapshotDate(snapshot.createdAt),
        snapshot.note,
    ].filter(Boolean).join(' · ');
};

export const toMenuItem = (snapshot: ScriptSnapshot): ScriptStateMenuItem => ({
    id: snapshot.id,
    label: getScriptSnapshotLabel(snapshot),
    detail: describeSnapshot(snapshot),
});

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'An unexpected error occurred.');

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

export const toStateRecord = (snapshot: ScriptSnapshot): ScriptStateRecord => {
    const {pageCount, sceneCount} = snapshot.summaryMetadata ?? {pageCount: null, sceneCount: null};

    return {
        id: snapshot.id,
        kind: snapshot.kind,
        label: getScriptSnapshotLabel(snapshot),
        name: snapshot.name,
        note: snapshot.note,
        savedAt: formatSnapshotDate(snapshot.createdAt),
        origin: getScriptSnapshotOrigin(snapshot),
        facts: [
            ...sceneCount === null ? [] : [sceneCount === 1 ? '1 scene' : `${sceneCount} scenes`],
            ...pageCount === null ? [] : [pageCount === 1 ? '1 page' : `${pageCount} pages`],
        ],
    };
};

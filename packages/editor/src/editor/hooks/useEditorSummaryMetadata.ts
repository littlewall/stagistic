import {
    buildScriptSummaryMetadata,
    type EditorSettingsOverride,
    type ScriptDocument,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/core';
import type {Transaction} from '@tiptap/pm/state';
import {
    useCallback,
    useEffect,
    useRef,
} from 'react';

import type {EditorSaveCallbacks} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {paginationKey} from '../tiptap/extensions/pagination/plugin/createPaginationPlugin';
import {getEditorPaginationStorage, getMeasuredEditorPageCount} from './editorSaveSnapshot';
import {useLatestRef} from './useLatestRef';

type SummarySnapshot = {
    document: object,
    metadata: string,
    settings: string,
};

/** A rejected refresh is retried without waiting for another layout event. */
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_RETRY_DELAY_MS = 250;

const matchesSnapshot = (left: SummarySnapshot | null, right: SummarySnapshot) => {
    return left?.document === right.document && left.metadata === right.metadata && left.settings === right.settings;
};

export const useEditorSummaryMetadata = (
    editor: TiptapEditor | null,
    dirtyRef: {current: boolean},
    onSummaryMetadataChange: EditorSaveCallbacks['onSummaryMetadataChange'],
    scriptSettings?: EditorSettingsOverride,
) => {
    const callbackRef = useLatestRef(onSummaryMetadataChange);
    const settingsRef = useLatestRef(scriptSettings);
    const lastSnapshotRef = useRef<SummarySnapshot | null>(null);
    const pendingSnapshotRef = useRef<SummarySnapshot | null>(null);
    const refreshRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!editor) {
            return;
        }

        let disposed = false;
        let retryTimer: number | undefined;
        let rejected: {snapshot: SummarySnapshot, attempts: number} | null = null;

        lastSnapshotRef.current = null;
        pendingSnapshotRef.current = null;

        const refreshMetadata = () => {
            const callback = callbackRef.current;

            if (dirtyRef.current || !callback || editor.isDestroyed) {
                return;
            }

            const pageCount = getMeasuredEditorPageCount(editor);

            if (pageCount === null) {
                return;
            }

            const document = editor.state.doc;
            const value = stripScriptSettings(editor.getJSON() as ScriptDocument);
            const metadata = buildScriptSummaryMetadata(value, pageCount);
            const settings = settingsRef.current;
            const optionsVersion = getEditorPaginationStorage(editor)?.optionsVersion;
            const snapshot = {
                document,
                metadata: JSON.stringify(metadata),
                settings: JSON.stringify(settings ?? null),
            };

            if (matchesSnapshot(lastSnapshotRef.current, snapshot) || matchesSnapshot(pendingSnapshotRef.current, snapshot)) {
                return;
            }

            const attempts = rejected && matchesSnapshot(rejected.snapshot, snapshot) ? rejected.attempts : 0;

            // A rejected snapshot is only retried by its timer, not by every layout event.
            if (attempts >= MAX_REFRESH_ATTEMPTS || (attempts > 0 && retryTimer !== undefined)) {
                return;
            }

            pendingSnapshotRef.current = snapshot;
            void Promise.resolve().then(async () => {
                if (disposed || editor.isDestroyed || dirtyRef.current
                    || pendingSnapshotRef.current !== snapshot || editor.state.doc !== document
                    || callbackRef.current !== callback || settingsRef.current !== settings
                    || getEditorPaginationStorage(editor)?.optionsVersion !== optionsVersion
                    || getMeasuredEditorPageCount(editor) !== pageCount) {
                    return;
                }

                const result = await callback(value, metadata, settings ?? null);

                if (disposed || pendingSnapshotRef.current !== snapshot) {
                    return;
                }

                if (result === false) {
                    rejected = {snapshot, attempts: attempts + 1};
                    window.clearTimeout(retryTimer);
                    retryTimer = rejected.attempts >= MAX_REFRESH_ATTEMPTS ? undefined : window.setTimeout(() => {
                        retryTimer = undefined;
                        refreshMetadata();
                    }, REFRESH_RETRY_DELAY_MS);
                } else {
                    lastSnapshotRef.current = snapshot;
                    rejected = null;
                }
            }).catch(() => {})
                .finally(() => {
                    if (pendingSnapshotRef.current === snapshot) {
                        pendingSnapshotRef.current = null;
                    }
                });
        };

        const handleTransaction = ({transaction}: {transaction: Transaction}) => {
            if (transaction.getMeta(paginationKey)) {
                refreshMetadata();
            }
        };

        refreshRef.current = refreshMetadata;
        editor.on('transaction', handleTransaction);
        refreshMetadata();

        return () => {
            disposed = true;
            window.clearTimeout(retryTimer);
            refreshRef.current = null;
            editor.off('transaction', handleTransaction);
        };
    }, [
        callbackRef,
        dirtyRef,
        editor,
        settingsRef,
    ]);

    return useCallback(() => refreshRef.current?.(), []);
};

import type {EditorCollaboration} from '@stagistic/editor';
import {
    buildScriptBlockIndex,
    coerceUnknownBlocksToStageDirections,
    ensureSceneHeading,
    ensureScriptBlockIds,
    ensureScriptStructure,
    SCRIPT_DOCUMENT_SCHEMA_VERSION,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script';
import {
    BODY_FIELD,
    bodyDocToScriptDocument,
    type OpenedScript,
    resolveSchemaGate,
    type SyncEngineClient,
} from '@stagistic/sync-engine';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {shouldAutoFocusInitialScript} from './initialScriptFocus';

type ScriptLoaderResult = {
    initialValue: ScriptDocument | null | undefined,
    initialIndexSnapshot: ScriptBlockIndexSnapshot | null | undefined,
    storageError: string | null,
    shouldAutoFocus: boolean,
    setStorageError: (value: string | null) => void,
    /** Shared Y.Doc replica (web); null when loading through the repository. */
    replica: OpenedScript | null,
    collaboration: EditorCollaboration | undefined,
    /** Written by a newer app version: shown, never saved (schema gate). */
    isReadOnly: boolean,
};

type ScriptLoaderRepository = {
    loadLatest: (scriptId: string) => Promise<ScriptDocument | null>,
    saveLatest: (scriptId: string, value: ScriptDocument) => Promise<unknown>,
};

const NEWER_SCHEMA_ERROR = 'This script was saved by a newer version of Stagistic. Reload the page to edit it.';

export const useScriptLoader = (
    currentScriptId: string | null,
    scriptRepository: ScriptLoaderRepository,
    documentSync: SyncEngineClient | null = null,
): ScriptLoaderResult => {
    const [initialValue, setInitialValue] = useState<ScriptDocument | null | undefined>(undefined);
    const [initialIndexSnapshot, setInitialIndexSnapshot] = useState<ScriptBlockIndexSnapshot | null | undefined>(undefined);
    const [storageError, setStorageErrorState] = useState<string | null>(null);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const [replica, setReplica] = useState<OpenedScript | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);

    useEffect(() => {
        if (!currentScriptId) {
            return;
        }

        let isActive = true;

        setInitialValue(undefined);
        setInitialIndexSnapshot(undefined);
        setShouldAutoFocus(false);
        setReplica(null);
        setIsReadOnly(false);

        if (documentSync) {
            let opened: OpenedScript | null = null;

            const openReplica = async () => {
                try {
                    opened = await documentSync.openScript(currentScriptId);

                    if (!isActive) {
                        opened.release();

                        return;
                    }

                    // The engine seeded and normalized the doc once; no load-time rewrites here.
                    const value = bodyDocToScriptDocument(opened.body);
                    const readOnly = resolveSchemaGate(opened.schemaVersion, SCRIPT_DOCUMENT_SCHEMA_VERSION) === 'read-only';

                    setStorageErrorState(readOnly ? NEWER_SCHEMA_ERROR : null);
                    setReplica(opened);
                    setIsReadOnly(readOnly);
                    setInitialValue(value);
                    setInitialIndexSnapshot(buildScriptBlockIndex(value).snapshot);
                    setShouldAutoFocus(shouldAutoFocusInitialScript(value));
                } catch {
                    if (!isActive) {
                        return;
                    }

                    console.error('Failed to open script document');
                    setStorageErrorState('Failed to load script data.');
                }
            };

            void openReplica();

            return () => {
                isActive = false;
                opened?.release();
            };
        }

        const loadLatest = async () => {
            try {
                const stored = await scriptRepository.loadLatest(currentScriptId);

                if (!isActive) {
                    return;
                }

                setStorageErrorState(null);
                if (!stored) {
                    const fallback = ensureSceneHeading(null);
                    const normalizedFallback = ensureScriptStructure(fallback);

                    setInitialValue(normalizedFallback);
                    setInitialIndexSnapshot(buildScriptBlockIndex(normalizedFallback).snapshot);
                    setShouldAutoFocus(true);

                    return;
                }

                const needsFocus = shouldAutoFocusInitialScript(stored);

                const coerced = coerceUnknownBlocksToStageDirections(stored);

                if (coerced.changed) {
                    await scriptRepository.saveLatest(currentScriptId, coerced.value);
                }

                const withIds = ensureScriptBlockIds(coerced.value);
                const withScene = ensureSceneHeading(withIds);
                const normalized = ensureScriptStructure(withScene);
                const fallbackIndex = buildScriptBlockIndex(normalized).snapshot;

                setInitialValue(normalized);
                setInitialIndexSnapshot(fallbackIndex);
                setShouldAutoFocus(needsFocus);
            } catch {
                console.error('Failed to load latest script');
                setStorageErrorState('Failed to load script data.');

                const fallback = ensureSceneHeading(null);
                const normalizedFallback = ensureScriptStructure(fallback);

                setInitialValue(normalizedFallback);
                setInitialIndexSnapshot(buildScriptBlockIndex(normalizedFallback).snapshot);
                setShouldAutoFocus(true);
            }
        };

        void loadLatest();

        return () => {
            isActive = false;
        };
    }, [
        currentScriptId,
        documentSync,
        scriptRepository,
    ]);

    const collaboration = useMemo<EditorCollaboration | undefined>(
        () => replica && !isReadOnly ? {document: replica.body, field: BODY_FIELD} : undefined,
        [isReadOnly, replica],
    );

    return {
        initialValue,
        initialIndexSnapshot,
        storageError,
        shouldAutoFocus,
        setStorageError: value => setStorageErrorState(value),
        replica,
        collaboration,
        isReadOnly,
    };
};

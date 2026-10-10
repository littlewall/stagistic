import {
    getScriptSnapshotLabel,
    loadScriptSnapshot,
    type ScriptRepository,
    ScriptRepositoryProvider,
    type ScriptSnapshot,
    useScriptRepository,
    useScriptSnapshots,
    useScriptSummary,
    useSnapshotViews,
} from '@stagistic/app-core';
import {
    createEditorSnapshotStore,
    createEditorSurfaceCache,
    EditorSnapshotStoreProvider,
} from '@stagistic/editor';
import {
    AppLayout,
    Button,
    LoaderOverlay,
} from '@stagistic/ui';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Outlet,
    useNavigate,
    useParams,
} from 'react-router-dom';

import {AppHeader} from '../../layout/AppHeader';
import styles from './ScriptWorkspaceRoute.module.css';
import {ScriptSettingsModalProvider} from './settings/ScriptSettingsModalProvider';
import {
    getScriptBasePath,
    type ScriptAccess,
    ScriptAccessProvider,
} from './workspace/ScriptAccessContext';
import {ScriptWorkspaceProvider, type ScriptWorkspaceValue} from './workspace/ScriptWorkspaceContext';
import {useScriptEditorController} from './workspace/useScriptEditorController';

const ScriptWorkspace = ({scriptId}: {scriptId: string | undefined}) => {
    const controller = useScriptEditorController(scriptId);
    const {
        editorLoadState,
        initialValue,
        storageError,
    } = controller;
    const editorSurfaceCache = useMemo(() => createEditorSurfaceCache(), []);
    const editorSnapshotStore = useMemo(() => createEditorSnapshotStore(), [scriptId]);
    const pendingCacheDestroyRef = useRef<number | null>(null);

    useEffect(() => {
        /*
         * Deferred + cancellable, so StrictMode's simulated remount does not
         * destroy the surface a mounted editor keeps using. Script switches
         * need no handling here: the next acquire() destroys the stale entry
         * (content is part of the surface signature).
         */
        if (pendingCacheDestroyRef.current !== null) {
            window.clearTimeout(pendingCacheDestroyRef.current);
            pendingCacheDestroyRef.current = null;
        }

        return () => {
            pendingCacheDestroyRef.current = window.setTimeout(() => {
                pendingCacheDestroyRef.current = null;
                editorSurfaceCache.destroy();
            }, 0);
        };
    }, [editorSurfaceCache]);

    const workspaceValue = useMemo<ScriptWorkspaceValue>(
        () => ({
            ...controller,
            editorSnapshotStore,
            editorSurfaceCache,
        }),
        [
            controller,
            editorSnapshotStore,
            editorSurfaceCache,
        ],
    );

    if (editorLoadState.isLoading || !initialValue) {
        return (
            <LoaderOverlay
                label="Preparing editor"
                messages={[
                    storageError
                    ?? editorLoadState.statusText
                    ?? 'Loading your script',
                ]}
                progress={editorLoadState.progress}
            />
        );
    }

    return (
        <ScriptWorkspaceProvider value={workspaceValue}>
            <EditorSnapshotStoreProvider store={editorSnapshotStore}>
                <ScriptSettingsModalProvider>
                    <Outlet />
                </ScriptSettingsModalProvider>
            </EditorSnapshotStoreProvider>
        </ScriptWorkspaceProvider>
    );
};

const LiveScriptWorkspace = ({scriptId}: {scriptId: string | undefined}) => {
    const repository = useScriptRepository();
    const {script} = useScriptSummary(scriptId);
    const access = useMemo<ScriptAccess>(() => ({
        isReadOnly: false,
        snapshot: null,
        liveRepository: repository,
        liveScriptTitle: script?.name ?? null,
        basePath: scriptId ? getScriptBasePath(scriptId) : null,
    }), [
        repository,
        script?.name,
        scriptId,
    ]);

    return (
        <ScriptAccessProvider value={access}>
            <ScriptWorkspace scriptId={scriptId} />
        </ScriptAccessProvider>
    );
};

type SnapshotViewState =
    | {status: 'loading'}
    | {status: 'ready', repository: ScriptRepository}
    | {status: 'error', message: string};

const describeSnapshotError = (code: string | undefined) => {
    if (code === 'unsupported_document_schema_version' || code === 'unsupported_format_version') {
        return 'This state was saved by a newer version of Stagistic.';
    }

    return 'This state could not be opened.';
};

const SnapshotScriptWorkspace = ({scriptId, snapshotId}: {scriptId: string, snapshotId: string}) => {
    const navigate = useNavigate();
    const liveRepository = useScriptRepository();
    const snapshotViews = useSnapshotViews();
    const {script} = useScriptSummary(scriptId);
    const {snapshots, isLoading: areSnapshotsLoading} = useScriptSnapshots(scriptId, liveRepository);
    const snapshot: ScriptSnapshot | null = snapshots.find(item => item.id === snapshotId) ?? null;
    const [viewState, setViewState] = useState<SnapshotViewState>({status: 'loading'});

    useEffect(() => {
        let isActive = true;

        const open = async () => {
            if (!snapshotViews) {
                setViewState({status: 'error', message: 'Viewing saved states is not available here.'});

                return;
            }

            const loaded = await loadScriptSnapshot({
                repository: liveRepository,
                scriptId,
                snapshotId,
            });

            if (!loaded.ok) {
                if (isActive) {
                    setViewState({status: 'error', message: describeSnapshotError(loaded.issues[0]?.code)});
                }

                return;
            }

            const repository = await snapshotViews.open(loaded.snapshot);

            if (isActive) {
                setViewState({status: 'ready', repository});
            }
        };

        void open().catch(() => {
            if (isActive) {
                setViewState({status: 'error', message: describeSnapshotError(undefined)});
            }
        });

        return () => {
            isActive = false;
        };
    }, [
        liveRepository,
        scriptId,
        snapshotId,
        snapshotViews,
    ]);

    // A snapshot deleted elsewhere (e.g. from Manage) returns the writer to the current script.
    useEffect(() => {
        if (!areSnapshotsLoading && !snapshot && viewState.status === 'ready') {
            void navigate(`${getScriptBasePath(scriptId)}/editor`, {replace: true});
        }
    }, [
        areSnapshotsLoading,
        navigate,
        scriptId,
        snapshot,
        viewState.status,
    ]);

    const access = useMemo<ScriptAccess>(() => ({
        isReadOnly: true,
        snapshot,
        liveRepository,
        liveScriptTitle: script?.name ?? null,
        basePath: getScriptBasePath(scriptId, snapshotId),
    }), [
        liveRepository,
        script?.name,
        scriptId,
        snapshot,
        snapshotId,
    ]);

    if (viewState.status === 'error') {
        return (
            <AppLayout header={<AppHeader />} footer={null}>
                <div className={styles.message} role="alert">
                    <p>{viewState.message}</p>
                    <Button
                        variant="secondary"
                        onPress={() => void navigate(`${getScriptBasePath(scriptId)}/editor`, {replace: true})}
                    >
                        Back to current script
                    </Button>
                </div>
            </AppLayout>
        );
    }

    if (viewState.status === 'loading' || !snapshot) {
        return (
            <LoaderOverlay
                label={snapshot ? `Opening ${getScriptSnapshotLabel(snapshot)}` : 'Opening saved state'}
                messages={['Loading the saved script']}
            />
        );
    }

    return (
        <ScriptRepositoryProvider repository={viewState.repository} snapshotViews={snapshotViews}>
            <ScriptAccessProvider value={access}>
                <ScriptWorkspace scriptId={scriptId} />
            </ScriptAccessProvider>
        </ScriptRepositoryProvider>
    );
};

export const ScriptWorkspaceRoute = () => {
    const {scriptId, snapshotId} = useParams();

    if (scriptId && snapshotId) {
        return (
            <SnapshotScriptWorkspace
                key={`${scriptId}:${snapshotId}`}
                scriptId={scriptId}
                snapshotId={snapshotId}
            />
        );
    }

    return <LiveScriptWorkspace scriptId={scriptId} />;
};

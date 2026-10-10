import {
    createScriptSnapshotFromCurrent,
    getScriptSnapshotLabel,
    restoreScriptSnapshot,
    restoreScriptSnapshotAsNew,
    type ScriptSnapshot,
    useScriptSnapshots,
} from '@stagistic/app-core';
import {
    ManageScriptStatesModal,
    RestoreScriptStateModal,
    type RestoreScriptStateMode,
    SaveScriptStateModal,
    type ScriptStateDetails,
    type ScriptStateKind,
    ScriptStateMenu,
    type ScriptView,
    useToastController,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {getScriptBasePath, useScriptAccess} from '../workspace/ScriptAccessContext';
import {
    errorMessage,
    toManagedState,
    toMenuItem,
    waitForScriptInList,
} from './scriptStateItems';

interface UseScriptStateControlsArgs {
    scriptId: string | null,
    view: ScriptView,
    /** Persists pending editor changes of the current script. */
    flush?: () => Promise<void>,
}

/**
 * App-bar control and dialogs for stored drafts and versions: switching the
 * shown state, saving the current script, restoring and managing.
 */
export const useScriptStateControls = ({
    scriptId,
    view,
    flush,
}: UseScriptStateControlsArgs) => {
    const navigate = useNavigate();
    const {addToast} = useToastController();
    const {
        isReadOnly,
        snapshot: shownSnapshot,
        liveRepository,
        liveScriptTitle,
    } = useScriptAccess();
    const {snapshots} = useScriptSnapshots(scriptId, liveRepository);
    const [saveKind, setSaveKind] = useState<ScriptStateKind | null>(null);
    const [saveSubmitLabel, setSaveSubmitLabel] = useState<string | undefined>(undefined);
    const afterSaveRef = useRef<((snapshot: ScriptSnapshot) => void) | null>(null);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [restoreMode, setRestoreMode] = useState<RestoreScriptStateMode | null>(null);
    const [isPending, setIsPending] = useState(false);

    const versions = useMemo(() => snapshots.filter(snapshot => snapshot.kind === 'version').map(toMenuItem), [snapshots]);
    const drafts = useMemo(() => snapshots.filter(snapshot => snapshot.kind === 'draft').map(toMenuItem), [snapshots]);
    const managedStates = useMemo(() => snapshots.map(toManagedState), [snapshots]);

    const selectState = useCallback(async (snapshotId: string | null) => {
        if (!scriptId || snapshotId === (shownSnapshot?.id ?? null)) {
            return;
        }

        if (!isReadOnly) {
            await flush?.().catch(() => undefined);
        }

        void navigate(`${getScriptBasePath(scriptId, snapshotId)}/${view}`);
    }, [
        flush,
        isReadOnly,
        navigate,
        scriptId,
        shownSnapshot?.id,
        view,
    ]);

    /** Opens the save dialog; `afterSave` runs once the state is stored (e.g. to download a PDF). */
    const openSave = useCallback((kind: ScriptStateKind, options?: {submitLabel?: string, afterSave?: (snapshot: ScriptSnapshot) => void}) => {
        afterSaveRef.current = options?.afterSave ?? null;
        setSaveSubmitLabel(options?.submitLabel);
        setSaveKind(kind);
    }, []);

    const closeSave = useCallback(() => {
        afterSaveRef.current = null;
        setSaveKind(null);
    }, []);

    const handleSave = async (details: ScriptStateDetails) => {
        if (!scriptId || !saveKind) {
            return;
        }

        setIsPending(true);

        try {
            const created = await createScriptSnapshotFromCurrent({
                repository: liveRepository,
                scriptId,
                kind: saveKind,
                name: details.name,
                note: details.note,
                flush,
            });

            if (created) {
                addToast({
                    title: `${getScriptSnapshotLabel(created)} saved`,
                    description: 'You keep writing in the current script.',
                    variant: 'success',
                });
                afterSaveRef.current?.(created);
            }

            closeSave();
        } catch (error) {
            addToast({
                title: 'Could not save',
                description: errorMessage(error),
                variant: 'error',
            });
        } finally {
            setIsPending(false);
        }
    };

    const handleUpdate = async (snapshotId: string, update: {
        kind: ScriptStateKind,
        name: string,
        note: string,
    }) => {
        if (!scriptId) {
            return;
        }

        setIsPending(true);

        try {
            await liveRepository.updateScriptSnapshot(scriptId, snapshotId, {
                name: update.name,
                note: update.note,
                ...update.kind === 'version' ? {kind: 'version' as const} : {},
            });
        } catch (error) {
            addToast({
                title: 'Could not save changes',
                description: errorMessage(error),
                variant: 'error',
            });
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = async (snapshotId: string) => {
        if (!scriptId) {
            return;
        }

        setIsPending(true);

        try {
            await liveRepository.deleteScriptSnapshot(scriptId, snapshotId);
        } catch (error) {
            addToast({
                title: 'Could not delete',
                description: errorMessage(error),
                variant: 'error',
            });
        } finally {
            setIsPending(false);
        }
    };

    const handleRestore = async () => {
        if (!scriptId || !shownSnapshot) {
            return;
        }

        setIsPending(true);

        try {
            const result = await restoreScriptSnapshot({
                repository: liveRepository,
                scriptId,
                snapshot: shownSnapshot,
            });

            if (!result.ok) {
                addToast({
                    title: 'Could not restore',
                    description: 'The saved state could not be read.',
                    variant: 'error',
                });

                return;
            }

            setRestoreMode(null);
            addToast({
                title: `Restored ${getScriptSnapshotLabel(shownSnapshot)}`,
                description: result.backup ? `The previous state is saved as ${getScriptSnapshotLabel(result.backup)}.` : undefined,
                variant: 'success',
            });
            void navigate(`${getScriptBasePath(scriptId)}/editor`, {replace: true});
        } catch (error) {
            addToast({
                title: 'Could not restore',
                description: errorMessage(error),
                variant: 'error',
            });
        } finally {
            setIsPending(false);
        }
    };

    const handleRestoreAsNew = async (title: string) => {
        if (!scriptId || !shownSnapshot) {
            return;
        }

        setIsPending(true);

        try {
            const result = await restoreScriptSnapshotAsNew({
                repository: liveRepository,
                scriptId,
                snapshotId: shownSnapshot.id,
                title,
            });

            if (!result.ok) {
                addToast({
                    title: 'Could not create the script',
                    description: 'The saved state could not be read.',
                    variant: 'error',
                });

                return;
            }

            await waitForScriptInList(liveRepository, result.scriptId);
            setRestoreMode(null);
            addToast({title: `Created “${result.title}”`, variant: 'success'});
            void navigate(`${getScriptBasePath(result.scriptId)}/editor`);
        } catch (error) {
            addToast({
                title: 'Could not create the script',
                description: errorMessage(error),
                variant: 'error',
            });
        } finally {
            setIsPending(false);
        }
    };

    const shownLabel = shownSnapshot ? getScriptSnapshotLabel(shownSnapshot) : 'Current';

    const stateMenu: ReactNode = scriptId ? (
        <ScriptStateMenu
            label={shownLabel}
            selectedId={shownSnapshot?.id ?? null}
            versions={versions}
            drafts={drafts}
            onSelect={snapshotId => void selectState(snapshotId)}
            onSaveDraft={isReadOnly ? undefined : () => openSave('draft')}
            onSaveVersion={isReadOnly ? undefined : () => openSave('version')}
            onManage={snapshots.length > 0 ? () => setIsManageOpen(true) : undefined}
            restore={shownSnapshot ? {
                onRestore: () => setRestoreMode('restore'),
                onRestoreAsNew: () => setRestoreMode('restore-as-new'),
            } : undefined}
        />
    ) : null;

    const modals: ReactNode = (
        <>
            <SaveScriptStateModal
                isOpen={saveKind !== null}
                kind={saveKind ?? 'draft'}
                submitLabel={saveSubmitLabel}
                isPending={isPending}
                onClose={closeSave}
                onSubmit={handleSave}
            />
            <ManageScriptStatesModal
                isOpen={isManageOpen}
                states={managedStates}
                isPending={isPending}
                onClose={() => setIsManageOpen(false)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
            />
            <RestoreScriptStateModal
                isOpen={restoreMode !== null}
                mode={restoreMode ?? 'restore'}
                stateLabel={shownLabel}
                initialTitle={`${liveScriptTitle ?? 'Untitled script'} — ${shownLabel}`}
                isPending={isPending}
                onClose={() => setRestoreMode(null)}
                onRestore={handleRestore}
                onRestoreAsNew={handleRestoreAsNew}
            />
        </>
    );

    return {
        stateMenu,
        modals,
        openSave,
        shownLabel,
    };
};

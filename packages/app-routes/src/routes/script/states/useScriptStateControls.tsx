import {
    getScriptSnapshotLabel,
    type ScriptSnapshot,
    useScriptSnapshots,
} from '@stagistic/app-core';
import {
    RestoreScriptStateModal,
    type RestoreScriptStateMode,
    SaveScriptStateModal,
    type ScriptStateDetails,
    type ScriptStateKind,
    ScriptStateMenu,
    ScriptStatesModal,
    type ScriptStateUpdate,
    type ScriptView,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useMemo,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {getScriptBasePath, useScriptAccess} from '../workspace/ScriptAccessContext';
import {toMenuItem, toStateRecord} from './scriptStateItems';
import {useScriptStateActions} from './useScriptStateActions';

interface UseScriptStateControlsArgs {
    scriptId: string | null,
    view: ScriptView,
    /** Persists pending editor changes of the current script. */
    flush?: () => Promise<void>,
}

interface SaveRequest {
    kind: ScriptStateKind,
    submitLabel?: string,
    afterSave?: (snapshot: ScriptSnapshot) => void,
}

interface ManagerState {
    kind: ScriptStateKind,
    selectedId: string | null,
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
    const {
        isReadOnly,
        snapshot: shownSnapshot,
        liveRepository,
        liveScriptTitle,
    } = useScriptAccess();
    const {snapshots} = useScriptSnapshots(scriptId, liveRepository);
    const actions = useScriptStateActions(scriptId, flush);
    const [saveRequest, setSaveRequest] = useState<SaveRequest | null>(null);
    const [manager, setManager] = useState<ManagerState | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<{snapshot: ScriptSnapshot, mode: RestoreScriptStateMode} | null>(null);
    // The kind outlives the request so the closing save dialog keeps its copy.
    const [lastSaveKind, setLastSaveKind] = useState<ScriptStateKind>('draft');
    const shownId = shownSnapshot?.id ?? null;

    const versions = useMemo(() => snapshots.filter(snapshot => snapshot.kind === 'version').map(toMenuItem), [snapshots]);
    const drafts = useMemo(() => snapshots.filter(snapshot => snapshot.kind === 'draft').map(toMenuItem), [snapshots]);
    const records = useMemo(() => snapshots.map(toStateRecord), [snapshots]);
    const findSnapshot = (snapshotId: string) => snapshots.find(snapshot => snapshot.id === snapshotId) ?? null;

    const selectState = useCallback(async (snapshotId: string | null) => {
        if (!scriptId || snapshotId === shownId) {
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
        shownId,
        view,
    ]);

    /** Opens the save dialog; `afterSave` runs once the state is stored (e.g. to download a PDF). */
    const openSave = useCallback((kind: ScriptStateKind, options?: Omit<SaveRequest, 'kind'>) => {
        setLastSaveKind(kind);
        setSaveRequest({kind, ...options});
    }, []);

    const handleSave = async (details: ScriptStateDetails) => {
        if (!saveRequest) {
            return;
        }

        const created = await actions.save(saveRequest.kind, details);

        if (created) {
            saveRequest.afterSave?.(created);
            setSaveRequest(null);

            if (manager) {
                setManager({kind: created.kind, selectedId: created.id});
            }
        }
    };

    const handleUpdate = async (snapshotId: string, update: ScriptStateUpdate) => {
        const updated = await actions.update(snapshotId, update);

        // A draft marked as a version moves to the Versions tab and stays selected.
        if (updated && manager && updated.kind !== manager.kind) {
            setManager({kind: updated.kind, selectedId: updated.id});
        }
    };

    const requestRestore = (snapshotId: string, mode: RestoreScriptStateMode) => {
        const snapshot = findSnapshot(snapshotId);

        if (snapshot) {
            setRestoreTarget({snapshot, mode});
        }
    };

    const handleRestore = async () => {
        if (restoreTarget && await actions.restore(restoreTarget.snapshot)) {
            setRestoreTarget(null);
            setManager(null);
        }
    };

    const handleRestoreAsNew = async (title: string) => {
        if (restoreTarget && await actions.restoreAsNew(restoreTarget.snapshot, title)) {
            setRestoreTarget(null);
            setManager(null);
        }
    };

    const shownLabel = shownSnapshot ? getScriptSnapshotLabel(shownSnapshot) : 'Current';
    const restoreLabel = restoreTarget ? getScriptSnapshotLabel(restoreTarget.snapshot) : shownLabel;

    const stateMenu: ReactNode = scriptId ? (
        <ScriptStateMenu
            label={shownLabel}
            selectedId={shownId}
            versions={versions}
            drafts={drafts}
            onSelect={snapshotId => void selectState(snapshotId)}
            onSaveDraft={isReadOnly ? undefined : () => openSave('draft')}
            onSaveVersion={isReadOnly ? undefined : () => openSave('version')}
            onManage={() => setManager({kind: shownSnapshot?.kind ?? 'draft', selectedId: shownId})}
            restore={shownSnapshot ? {
                onRestore: () => requestRestore(shownSnapshot.id, 'restore'),
                onRestoreAsNew: () => requestRestore(shownSnapshot.id, 'restore-as-new'),
            } : undefined}
        />
    ) : null;

    const modals: ReactNode = (
        <>
            <ScriptStatesModal
                isOpen={manager !== null}
                activeKind={manager?.kind ?? 'draft'}
                states={records}
                shownStateId={shownId}
                initialSelectedId={manager?.selectedId ?? null}
                isPending={actions.isPending}
                onClose={() => setManager(null)}
                onSelectKind={kind => setManager({kind, selectedId: null})}
                onCreate={isReadOnly ? undefined : kind => openSave(kind)}
                onUpdate={handleUpdate}
                onDelete={async snapshotId => {
                    await actions.remove(snapshotId);
                }}
                onOpen={snapshotId => {
                    setManager(null);
                    void selectState(snapshotId);
                }}
                onRestore={snapshotId => requestRestore(snapshotId, 'restore')}
                onRestoreAsNew={snapshotId => requestRestore(snapshotId, 'restore-as-new')}
            />
            <SaveScriptStateModal
                isOpen={saveRequest !== null}
                kind={saveRequest?.kind ?? lastSaveKind}
                submitLabel={saveRequest?.submitLabel}
                isPending={actions.isPending}
                onClose={() => setSaveRequest(null)}
                onSubmit={handleSave}
            />
            <RestoreScriptStateModal
                isOpen={restoreTarget !== null}
                mode={restoreTarget?.mode ?? 'restore'}
                stateLabel={restoreLabel}
                initialTitle={`${liveScriptTitle ?? 'Untitled script'} — ${restoreLabel}`}
                isPending={actions.isPending}
                onClose={() => setRestoreTarget(null)}
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

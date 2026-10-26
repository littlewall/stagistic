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
    useRef,
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
    returnFocus?: HTMLElement | null,
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
    const saveTrigger = useRef<HTMLElement | null>(null);
    const managerTrigger = useRef<HTMLElement | null>(null);
    const restoreTrigger = useRef<HTMLElement | null>(null);
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
        saveTrigger.current = options?.returnFocus ?? null;
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

    const requestRestore = (snapshotId: string, mode: RestoreScriptStateMode, returnFocus?: HTMLElement | null) => {
        restoreTrigger.current = returnFocus ?? null;

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
            onSaveDraft={isReadOnly ? undefined : trigger => openSave('draft', {returnFocus: trigger})}
            onSaveVersion={isReadOnly ? undefined : trigger => openSave('version', {returnFocus: trigger})}
            onManage={trigger => {
                managerTrigger.current = trigger ?? null;
                setManager({kind: shownSnapshot?.kind ?? 'draft', selectedId: shownId});
            }}
            restore={shownSnapshot ? {
                onRestore: trigger => requestRestore(shownSnapshot.id, 'restore', trigger),
                onRestoreAsNew: trigger => requestRestore(shownSnapshot.id, 'restore-as-new', trigger),
            } : undefined}
        />
    ) : null;

    const modals: ReactNode = (
        <>
            <ScriptStatesModal
                returnFocus={managerTrigger}
                isOpen={manager !== null}
                activeKind={manager?.kind ?? 'draft'}
                states={records}
                shownStateId={shownId}
                initialSelectedId={manager?.selectedId ?? null}
                isPending={actions.isPending}
                onClose={() => setManager(null)}
                onSelectKind={kind => setManager({kind, selectedId: null})}
                onCreate={isReadOnly ? undefined : (kind, trigger) => openSave(kind, {returnFocus: trigger})}
                onUpdate={handleUpdate}
                onDelete={async snapshotId => {
                    await actions.remove(snapshotId);
                }}
                onOpen={snapshotId => {
                    setManager(null);
                    void selectState(snapshotId);
                }}
                onRestore={(snapshotId, trigger) => requestRestore(snapshotId, 'restore', trigger)}
                onRestoreAsNew={(snapshotId, trigger) => requestRestore(snapshotId, 'restore-as-new', trigger)}
            />
            <SaveScriptStateModal
                returnFocus={saveTrigger}
                fallbackFocus={() => document.querySelector('dialog[aria-label="Drafts and versions"] [aria-selected="true"]')}
                isOpen={saveRequest !== null}
                kind={saveRequest?.kind ?? lastSaveKind}
                submitLabel={saveRequest?.submitLabel}
                isPending={actions.isPending}
                onClose={() => setSaveRequest(null)}
                onSubmit={handleSave}
            />
            <RestoreScriptStateModal
                returnFocus={restoreTrigger}
                fallbackFocus={() => document.querySelector('dialog[aria-label="Drafts and versions"] [aria-selected="true"]')}
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

import {
    createScriptSnapshotFromCurrent,
    getScriptSnapshotLabel,
    restoreScriptSnapshot,
    restoreScriptSnapshotAsNew,
    type ScriptSnapshot,
} from '@stagistic/app-core';
import {
    type ScriptStateDetails,
    type ScriptStateKind,
    type ScriptStateUpdate,
    useToastController,
} from '@stagistic/ui';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {getScriptBasePath, useScriptAccess} from '../workspace/ScriptAccessContext';
import {SCRIPT_WORKSPACE_RELOAD_STATE} from '../workspace/scriptWorkspaceReload';
import {errorMessage, waitForScriptInList} from './scriptStateItems';

/**
 * Stored-state operations on the current script's repository, with toasts and
 * the navigation that follows. Every operation reports whether it succeeded.
 */
export const useScriptStateActions = (scriptId: string | null, flush?: () => Promise<void>) => {
    const navigate = useNavigate();
    const {addToast} = useToastController();
    const {isReadOnly, liveRepository} = useScriptAccess();
    const [isPending, setIsPending] = useState(false);

    const run = async <T>(failureTitle: string, operation: (id: string) => Promise<T>): Promise<T | null> => {
        if (!scriptId) {
            return null;
        }

        setIsPending(true);

        try {
            return await operation(scriptId);
        } catch (error) {
            addToast({
                title: failureTitle,
                description: errorMessage(error),
                variant: 'error',
            });

            return null;
        } finally {
            setIsPending(false);
        }
    };

    const save = (kind: ScriptStateKind, details: ScriptStateDetails) => run('Could not save', async id => {
        const created = await createScriptSnapshotFromCurrent({
            repository: liveRepository,
            scriptId: id,
            kind,
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
        }

        return created;
    });

    const update = (snapshotId: string, change: ScriptStateUpdate) => run('Could not save changes', id => {
        return liveRepository.updateScriptSnapshot(id, snapshotId, {
            name: change.name,
            note: change.note,
            ...change.kind === 'version' ? {kind: 'version' as const} : {},
        });
    });

    const remove = (snapshotId: string) => run('Could not delete', async id => {
        await liveRepository.deleteScriptSnapshot(id, snapshotId);

        return true;
    });

    const restore = (snapshot: ScriptSnapshot) => run('Could not restore', async id => {
        // Pending edits of the current script belong to the backup draft.
        if (!isReadOnly) {
            await flush?.();
        }

        const result = await restoreScriptSnapshot({
            repository: liveRepository,
            scriptId: id,
            snapshot,
        });

        if (!result.ok) {
            throw new Error('The saved state could not be read.');
        }

        addToast({
            title: `Restored ${getScriptSnapshotLabel(snapshot)}`,
            description: result.backup ? `The previous state is saved as ${getScriptSnapshotLabel(result.backup)}.` : undefined,
            variant: 'success',
        });
        // The workspace remounts and loads the restored script from storage.
        void navigate(`${getScriptBasePath(id)}/editor`, {replace: true, state: {[SCRIPT_WORKSPACE_RELOAD_STATE]: Date.now()}});

        return true;
    });

    const restoreAsNew = (snapshot: ScriptSnapshot, title: string) => run('Could not create the script', async id => {
        const result = await restoreScriptSnapshotAsNew({
            repository: liveRepository,
            scriptId: id,
            snapshotId: snapshot.id,
            title,
        });

        if (!result.ok) {
            throw new Error('The saved state could not be read.');
        }

        await waitForScriptInList(liveRepository, result.scriptId);
        addToast({title: `Created “${result.title}”`, variant: 'success'});
        void navigate(`${getScriptBasePath(result.scriptId)}/editor`);

        return true;
    });

    return {
        isPending,
        save,
        update,
        remove,
        restore,
        restoreAsNew,
    };
};

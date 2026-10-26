import {createSnapshotSettingsSaver, type ScriptRepository} from '@stagistic/app-core';
import {useEffect, useMemo} from 'react';

/** Saves settings edited in a stored draft or version back into it; see `createSnapshotSettingsSaver`. */
export const useSnapshotSettingsSaver = (liveRepository: ScriptRepository, scriptId: string, snapshotId: string) => {
    const saver = useMemo(() => createSnapshotSettingsSaver({
        liveRepository,
        scriptId,
        snapshotId,
        onError: error => console.error('[snapshots] Could not save the settings of the saved state.', error),
    }), [
        liveRepository,
        scriptId,
        snapshotId,
    ]);

    // Pending saves still finish when the view goes away.
    useEffect(() => () => {
        void saver.flush();
    }, [saver]);

    return saver;
};

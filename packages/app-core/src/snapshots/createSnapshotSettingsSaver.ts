import type {ScriptRepository} from '@stagistic/db';

import {createCoalescingSaver} from './createCoalescingSaver';
import {saveScriptSnapshotFromView} from './scriptSnapshotOperations';

/**
 * Saves settings edited in a stored draft or version back into that snapshot.
 * Bind the view repository once it is open and pass `request` as the view's
 * `onSettingsWrite`; `flush` waits for pending saves.
 */
export const createSnapshotSettingsSaver = ({
    liveRepository,
    scriptId,
    snapshotId,
    onError,
}: {
    liveRepository: ScriptRepository,
    scriptId: string,
    snapshotId: string,
    onError: (error: unknown) => void,
}) => {
    let viewRepository: ScriptRepository | null = null;
    const {request, flush} = createCoalescingSaver(async () => {
        if (viewRepository) {
            await saveScriptSnapshotFromView({
                viewRepository,
                liveRepository,
                scriptId,
                snapshotId,
            });
        }
    }, onError);

    return {
        bind: (repository: ScriptRepository) => {
            viewRepository = repository;
        },
        request,
        flush,
    };
};

import type {ScriptRepository} from '@stagistic/db';
import {readStepkg} from '@stagistic/stepkg';

import type {StepkgImportResult} from './importScriptPackageAsNew';
import {mapStepkgSnapshotToPackageWrite} from './mapStepkgSnapshotToPackageWrite';

export interface RestoreScriptPackageArgs {
    repository: ScriptRepository;
    bytes: Uint8Array;
}

export const restoreScriptPackage = async ({repository, bytes}: RestoreScriptPackageArgs): Promise<StepkgImportResult> => {
    const read = await readStepkg(bytes);
    if (!read.ok) return {ok: false, issues: read.issues};

    const write = mapStepkgSnapshotToPackageWrite(read.package.snapshot, read.package.assets);

    try {
        await repository.restoreScriptFromPackage(write);
    } catch {
        return {ok: false, issues: [{code: 'write_failed', stage: 'write'}]};
    }

    return {ok: true, scriptId: write.script.id, title: write.script.title};
};

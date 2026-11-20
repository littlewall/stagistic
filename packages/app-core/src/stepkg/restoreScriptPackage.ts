import type {ScriptRepository} from '@stagistic/db';
import {readStepkg} from '@stagistic/stepkg';

import type {ExclusiveResult} from '../editing-lock';
import type {StepkgImportResult} from './importScriptPackageAsNew';
import {mapStepkgSnapshotToPackageWrite} from './mapStepkgSnapshotToPackageWrite';

export class ScriptOpenElsewhereError extends Error {
    constructor() {
        super('This script is open for editing in another tab.');
        this.name = 'ScriptOpenElsewhereError';
    }
}

export interface RestoreScriptPackageArgs {
    repository: ScriptRepository,
    bytes: Uint8Array,
    /** Holds the script's edit lock for the whole replace; without it the replace runs unguarded. */
    runExclusive?: <T>(scriptId: string, run: () => Promise<T>) => Promise<ExclusiveResult<T>>,
}

export const restoreScriptPackage = async ({
    repository,
    bytes,
    runExclusive,
}: RestoreScriptPackageArgs): Promise<StepkgImportResult> => {
    const read = await readStepkg(bytes);

    if (!read.ok) return {ok: false, issues: read.issues};

    const write = mapStepkgSnapshotToPackageWrite(read.package.snapshot, read.package.assets);

    const replace = () => repository.restoreScriptFromPackage(write).then(() => true, () => false);
    const outcome = runExclusive ? await runExclusive(write.script.id, replace) : {ran: true as const, value: await replace()};

    if (!outcome.ran) {
        throw new ScriptOpenElsewhereError();
    }

    if (!outcome.value) {
        return {ok: false, issues: [{code: 'write_failed', stage: 'write'}]};
    }

    return {
        ok: true,
        scriptId: write.script.id,
        title: write.script.title,
        ...read.issues.length ? {issues: read.issues} : {},
    };
};

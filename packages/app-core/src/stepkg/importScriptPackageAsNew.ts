import type {ScriptRepository} from '@stagistic/db';
import {trimOrFallback} from '@stagistic/script';
import {readStepkg, remapStepkgIds, type StepkgImportIssue} from '@stagistic/stepkg';

import {mapStepkgSnapshotToPackageWrite} from './mapStepkgSnapshotToPackageWrite';

export type StepkgImportResult = {ok: true; scriptId: string; title: string} | {ok: false; issues: StepkgImportIssue[]};

export interface ImportScriptPackageAsNewArgs {
    repository: ScriptRepository;
    bytes: Uint8Array;
    title?: string;
}

export const importScriptPackageAsNew = async ({repository, bytes, title}: ImportScriptPackageAsNewArgs): Promise<StepkgImportResult> => {
    const read = await readStepkg(bytes);
    if (!read.ok) return {ok: false, issues: read.issues};

    const {snapshot} = remapStepkgIds(read.package.snapshot);
    const finalTitle = trimOrFallback(title ?? '', snapshot.script.title);
    const write = mapStepkgSnapshotToPackageWrite(snapshot, read.package.assets);
    write.script.title = finalTitle;

    try {
        await repository.createScriptFromPackage(write);
    } catch {
        return {ok: false, issues: [{code: 'write_failed', stage: 'write'}]};
    }

    return {ok: true, scriptId: write.script.id, title: finalTitle};
};

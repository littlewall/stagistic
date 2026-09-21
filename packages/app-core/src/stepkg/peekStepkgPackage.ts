import type {ScriptRepository} from '@stagistic/db';
import {readStepkgContainer, type StepkgImportIssue} from '@stagistic/stepkg';

export type StepkgPeekResult =
    | {ok: true; scriptId: string; packageTitle: string; existingScript: {id: string; title: string} | null}
    | {ok: false; issues: StepkgImportIssue[]};

export interface PeekStepkgPackageArgs {
    repository: ScriptRepository;
    bytes: Uint8Array;
}

export const peekStepkgPackage = async ({repository, bytes}: PeekStepkgPackageArgs): Promise<StepkgPeekResult> => {
    const container = await readStepkgContainer(bytes);
    if (!container.ok) return container;

    const {manifest} = container;
    const existing = await repository.getScriptSummary(manifest.script.id);

    return {
        ok: true,
        scriptId: manifest.script.id,
        packageTitle: manifest.script.title,
        existingScript: existing ? {id: existing.id, title: existing.title} : null,
    };
};

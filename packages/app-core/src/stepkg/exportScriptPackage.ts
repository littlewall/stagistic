import type {ScriptRepository} from '@stagistic/db';
import {createStepkg, type StepkgExportResult} from '@stagistic/stepkg';

import {mapScriptPackageSourceToStepkg} from './mapScriptPackageSource';

export interface ExportScriptPackageArgs {
    repository: ScriptRepository;
    scriptId: string;
    flush?: () => Promise<void>;
    generator: {name: string; version: string};
}

export const exportScriptPackage = async ({repository, scriptId, flush, generator}: ExportScriptPackageArgs): Promise<StepkgExportResult> => {
    try {
        await flush?.();
    } catch {
        return {ok: false, issues: [{code: 'editor_flush_failed', stage: 'flush'}]};
    }
    const source = await repository.getScriptPackageSource(scriptId);
    if (!source) return {ok: false, issues: [{code: 'script_not_found', stage: 'snapshot', entity: {type: 'script', id: scriptId}}]};
    return createStepkg({
        snapshot: mapScriptPackageSourceToStepkg(source),
        generator,
        createdAt: new Date(),
        loadAsset: storageKey => repository.getAttachmentBlob(storageKey),
    });
};

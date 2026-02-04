import type {ScriptSummary} from '@stagistic/db';
import type {ScriptDocument} from '@stagistic/shared';

export interface ScriptRepository {
    listScripts(options?: {limit?: number}): Promise<ScriptSummary[]>,
    getScriptSummary(scriptId: string): Promise<ScriptSummary | null>,
    createScript(title: string, initialContent?: ScriptDocument): Promise<string>,
    renameScript(scriptId: string, title: string): Promise<void>,
    deleteScript(scriptId: string): Promise<void>,
    setActiveBlock(scriptId: string, blockId: string | null): Promise<void>,
    loadLatest(scriptId: string): Promise<ScriptDocument | null>,
    saveLatest(scriptId: string, value: ScriptDocument): Promise<void>,
    commitVersion(scriptId: string, message?: string): Promise<string>,
    loadVersion?(versionId: string): Promise<ScriptDocument | null>,
    restoreLatestFromVersion?(scriptId: string, versionId: string): Promise<void>,
}

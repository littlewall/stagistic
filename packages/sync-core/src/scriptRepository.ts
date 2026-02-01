import type {ScriptSummary} from '@stagistic/db';
import type {SlateValue} from '@stagistic/shared';

export interface ScriptRepository {
    listScripts(): Promise<ScriptSummary[]>,
    createScript(title: string, initialContent?: SlateValue): Promise<string>,
    renameScript(scriptId: string, title: string): Promise<void>,
    deleteScript(scriptId: string): Promise<void>,
    setActiveBlock(scriptId: string, blockId: string | null): Promise<void>,
    loadLatest(scriptId: string): Promise<SlateValue | null>,
    saveLatest(scriptId: string, value: SlateValue): Promise<void>,
    commitVersion(scriptId: string, message?: string): Promise<string>,
    loadVersion?(versionId: string): Promise<SlateValue | null>,
    restoreLatestFromVersion?(scriptId: string, versionId: string): Promise<void>,
}

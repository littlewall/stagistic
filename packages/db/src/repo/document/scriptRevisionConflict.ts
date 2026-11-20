/**
 * A save started from text that is no longer the stored text: another tab,
 * a restore or an import changed the script since this tab loaded it.
 */
export class ScriptRevisionConflictError extends Error {
    constructor(scriptId: string) {
        super(`Script ${scriptId} changed since it was loaded here; the save was refused.`);
        this.name = 'ScriptRevisionConflictError';
    }
}

export interface ScriptListItem {
    id: string,
    name: string,
}

export type ScriptSyncState = 'idle' | 'saved' | 'saving' | 'error';

export type ScriptView = 'editor' | 'export';

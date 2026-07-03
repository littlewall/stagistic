export interface ScriptListItem {
    id: string,
    name: string,
}

export type ScriptSyncState = 'saved' | 'saving' | 'error';

export type ScriptView = 'editor' | 'export';

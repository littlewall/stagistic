export type ScriptMusicKind = 'song' | 'instrumental';

export interface ScriptMusicListItem {
    readonly id: string,
    readonly title: string,
    readonly kind: ScriptMusicKind,
    readonly assignmentLabel: string | null,
}

export interface CreateScriptMusicInput {
    readonly title: string,
    readonly kind: ScriptMusicKind,
}

export type UpdateScriptMusicInput = CreateScriptMusicInput;

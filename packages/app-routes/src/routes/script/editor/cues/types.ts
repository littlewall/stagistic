export type ScriptCueKind = 'song' | 'instrumental';

export interface ScriptCueListItem {
    readonly id: string,
    readonly title: string,
    readonly kind: ScriptCueKind,
    readonly assignmentLabel: string | null,
}

export interface CreateScriptCueInput {
    readonly title: string,
    readonly kind: ScriptCueKind,
}

import type {
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';

export interface ExportCharacter {
    id: string,
    key: string,
    displayName: string,
}

export interface ScriptData {
    doc: ScriptDocument,
    characters: ExportCharacter[],
    scriptTitle: string,
    titlePage: TitlePageSettings | null,
}

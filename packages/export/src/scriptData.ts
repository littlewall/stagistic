import type {
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';

export interface ExportCharacter {
    id: string,
    key: string,
    displayName: string,
}

export interface ExportInitialCharacter {
    id: string,
    displayName: string,
    outline: string | null,
    firstAppearanceOrder: number | null,
}

export interface ExportInitialPlace {
    id: string,
    name: string,
    firstAppearanceOrder: number,
}

export interface ScriptData {
    doc: ScriptDocument,
    characters: ExportCharacter[],
    initialCharacters: ExportInitialCharacter[],
    initialPlaces: ExportInitialPlace[],
    scriptTitle: string,
    titlePage: TitlePageSettings | null,
}

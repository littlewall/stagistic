import type {
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';

export interface ExportCharacter {
    id: string,
    key: string,
    displayName: string,
}

export interface ExportCharacterGroup {
    id: string,
    key: string,
    memberIds: string[],
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
    groups: ExportCharacterGroup[],
    initialCharacters: ExportInitialCharacter[],
    initialPlaces: ExportInitialPlace[],
    scriptTitle: string,
    titlePage: TitlePageSettings | null,
}

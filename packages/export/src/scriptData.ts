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

export interface ExportInitialVocalRange {
    id: string,
    displayName: string,
    voiceType: string | null,
    /** Scientific pitch notation, e.g. "F#3". */
    low: string,
    /** Scientific pitch notation, e.g. "A4". */
    high: string,
    firstAppearanceOrder: number | null,
}

export interface ScriptData {
    doc: ScriptDocument,
    characters: ExportCharacter[],
    groups: ExportCharacterGroup[],
    initialCharacters: ExportInitialCharacter[],
    initialPlaces: ExportInitialPlace[],
    initialVocalRanges: ExportInitialVocalRange[],
    scriptTitle: string,
    titlePage: TitlePageSettings | null,
}

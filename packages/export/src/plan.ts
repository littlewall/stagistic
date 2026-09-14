import type {
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';

import type {ContentsVariant} from './config';

export interface ForcedBreak {
    blockId: string,
    kind: 'new-page' | 'odd-page',
}

export interface PaginationOverrides {
    forcedBreaks: ForcedBreak[],
}

export interface CharactersAndPlacesInitialPagePlan {
    kind: 'characters-and-places',
    /** Defaults to true for plans created before independent Characters/Places controls. */
    showCharacters?: boolean,
    characters: Array<{
        id: string,
        displayName: string,
        outline: string | null,
    }>,
    places: Array<{
        id: string,
        name: string,
    }>,
    showCharacterOutlines: boolean,
}

export interface ContentsMusicEntry {
    musicId: string,
    /** Script-facing label from formatMusicNumber, e.g. "2)" or "2.A)". */
    number: string,
    title: string,
    /** Display names, group duplicates already removed. Empty when instrumental. */
    singers: string[],
    isInstrumental: boolean,
    startBlockId: string,
}

export interface ContentsSceneEntry {
    sceneNumber: number,
    title: string,
    startBlockId: string,
    music: ContentsMusicEntry[],
}

export interface ContentsActGroup {
    /** Null when the script has no act blocks. */
    name: string | null,
    /** Music placed inside the act but before its first scene, e.g. an overture. */
    preSceneMusic: ContentsMusicEntry[],
    scenes: ContentsSceneEntry[],
}

export interface ContentsInitialPagePlan {
    kind: 'contents',
    variant: ContentsVariant,
    acts: ContentsActGroup[],
    showScoreColumn: boolean,
}

export type InitialPagePlan =
    | CharactersAndPlacesInitialPagePlan
    | ContentsInitialPagePlan;

export interface LeadingPagesPlan {
    initialPages: InitialPagePlan[],
    manualBlankCount: number,
    showRomanPageNumbers: boolean,
    startEachInitialPageOnOddPage: boolean,
}

export interface IntegratedScorePostStep {
    kind: 'integrated-score',
    musicId: string,
    title: string,
    startBlockId: string,
    afterBlockId: string,
}

export type ExportPostStep = IntegratedScorePostStep;

export interface ExportPlan {
    doc: ScriptDocument,
    titlePage: TitlePageSettings | null,
    scriptTitle: string,
    leadingPages: LeadingPagesPlan,
    pagination: PaginationOverrides,
    postSteps: ExportPostStep[],
    /** When present, layout uses the full document and only these blocks remain visible. */
    visibleBlockIds?: string[],
}

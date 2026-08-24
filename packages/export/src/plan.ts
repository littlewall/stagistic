import type {
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';

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

export type InitialPagePlan = CharactersAndPlacesInitialPagePlan;

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

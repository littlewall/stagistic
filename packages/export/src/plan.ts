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

export interface ExportPostStep {
    kind: string,
}

export interface ExportPlan {
    doc: ScriptDocument,
    titlePage: TitlePageSettings | null,
    scriptTitle: string,
    leadingPages: LeadingPagesPlan,
    pagination: PaginationOverrides,
    postSteps: ExportPostStep[],
}

export interface CharacterFilterValue {
    mode: 'all' | 'only',
    characterIds: string[],
    /** Defaults to true for both export templates. */
    preserveFullScriptPagination?: boolean,
}

export interface PageBreakValue {
    sceneOnNewPage: boolean,
    sceneOnOddPage: boolean,
}

export type CharacterInitialPageOrder = 'name' | 'first-appearance';

export interface CharactersAndPlacesValue {
    enabled: boolean,
    showPlaces: boolean,
    showCharacterOutlines: boolean,
    characterOrder: CharacterInitialPageOrder,
}

export interface InitialPagesValue {
    startEachInitialPageOnOddPage: boolean,
    showPageNumbers: boolean,
    charactersAndPlaces: CharactersAndPlacesValue,
}

export interface BlankPageSpec {
    enabled: boolean,
    count: number,
}

export interface BlankPagesValue {
    betweenInitialPagesAndScript: BlankPageSpec,
}

export interface BasicExportConfig {
    characterFilter: CharacterFilterValue,
    pageBreaks: PageBreakValue,
    initialPages: InitialPagesValue,
    blankPages: BlankPagesValue,
}

export const BASIC_DEFAULTS: BasicExportConfig = {
    characterFilter: {
        mode: 'all', characterIds: [], preserveFullScriptPagination: true,
    },
    pageBreaks: {
        sceneOnNewPage: true,
        sceneOnOddPage: false,
    },
    initialPages: {
        startEachInitialPageOnOddPage: true,
        showPageNumbers: true,
        charactersAndPlaces: {
            enabled: true,
            showPlaces: true,
            showCharacterOutlines: false,
            characterOrder: 'name',
        },
    },
    blankPages: {
        betweenInitialPagesAndScript: {
            enabled: false,
            count: 1,
        },
    },
};

/** Integrated Score deliberately shares every user configurable option with Basic. */
export type IntegratedScoreExportConfig = BasicExportConfig;

export const INTEGRATED_SCORE_DEFAULTS: IntegratedScoreExportConfig = {
    ...BASIC_DEFAULTS,
    characterFilter: {...BASIC_DEFAULTS.characterFilter},
    pageBreaks: {...BASIC_DEFAULTS.pageBreaks},
    initialPages: {
        ...BASIC_DEFAULTS.initialPages,
        charactersAndPlaces: {...BASIC_DEFAULTS.initialPages.charactersAndPlaces},
    },
    blankPages: {
        betweenInitialPagesAndScript: {...BASIC_DEFAULTS.blankPages.betweenInitialPagesAndScript},
    },
};

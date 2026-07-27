export interface CharacterFilterValue {
    mode: 'all' | 'only',
    characterIds: string[],
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
    characterFilter: {mode: 'all', characterIds: []},
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

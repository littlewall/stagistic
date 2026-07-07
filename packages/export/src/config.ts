export interface CharacterFilterValue {
    mode: 'all' | 'only',
    characterIds: string[],
}

export interface PageBreakValue {
    actOnNewPage: boolean,
    sceneOnNewPage: boolean,
    sceneOnOddPage: boolean,
}

export interface BlankPageSpec {
    count: number,
    countsInNumbering: boolean,
}

export interface BlankPagesValue {
    betweenTitleAndScript: BlankPageSpec,
}

export interface BasicExportConfig {
    characterFilter: CharacterFilterValue,
    pageBreaks: PageBreakValue,
    blankPages: BlankPagesValue,
}

export const BASIC_DEFAULTS: BasicExportConfig = {
    characterFilter: {mode: 'all', characterIds: []},
    pageBreaks: {
        actOnNewPage: false,
        sceneOnNewPage: false,
        sceneOnOddPage: false,
    },
    blankPages: {betweenTitleAndScript: {count: 0, countsInNumbering: false}},
};

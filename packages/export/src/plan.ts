import type {ScriptDocument} from '@stagistic/script';

export interface ForcedBreak {
    blockId: string,
    kind: 'new-page' | 'odd-page',
}

export interface BlankPageSentinel {
    count: number,
    countsInNumbering: boolean,
}

export interface PaginationOverrides {
    forcedBreaks: ForcedBreak[],
    blankPagesBeforeScript: BlankPageSentinel,
}

export interface ExportPostStep {
    kind: string,
}

export interface ExportPlan {
    doc: ScriptDocument,
    pagination: PaginationOverrides,
    postSteps: ExportPostStep[],
}

export type TitlePageDraftDateMode = 'auto' | 'manual';
export type TitlePageDateFormat = 'dmy' | 'mdy';

export interface TitlePageCredit {
    credit: string,
    authors: string[],
}

export interface TitlePageSettings {
    subtitle?: string,
    credits?: TitlePageCredit[],
    source?: string,
    draftDateMode?: TitlePageDraftDateMode,
    draftDate?: string,
    dateFormat?: TitlePageDateFormat,
    contact?: string,
    copyright?: string,
}

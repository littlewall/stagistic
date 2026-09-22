export type TitlePageDraftDateMode = 'auto' | 'manual';
export type TitlePageDateFormat = 'dmy' | 'mdy';

export interface TitlePageCredit {
    credit: string;
    authors: string[];
}

export type TitlePageLogoMimeType = 'image/jpeg' | 'image/png';

export interface TitlePageLogo {
    dataUrl: string;
    filename: string;
    mimeType: TitlePageLogoMimeType;
    widthPx: number;
    heightPx: number;
    sizeBytes: number;
}

export interface TitlePageSettings {
    logo?: TitlePageLogo;
    subtitle?: string;
    credits?: TitlePageCredit[];
    source?: string;
    draftDateMode?: TitlePageDraftDateMode;
    draftDate?: string;
    dateFormat?: TitlePageDateFormat;
    contact?: string;
    copyright?: string;
}

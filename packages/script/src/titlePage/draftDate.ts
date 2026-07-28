import type {
    TitlePageDateFormat,
    TitlePageSettings,
} from './types';

export const getTodayIso = (): string => {
    const d = new Date();
    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;
};

export const formatDatePreview = (isoDate: string, format: TitlePageDateFormat): string => {
    const match = (/^(\d{4})-(\d{2})-(\d{2})/).exec(isoDate);

    if (!match) {
        return '';
    }

    const [
        ,
        year,
        month,
        day,
    ] = match;

    return format === 'dmy' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
};

export const resolveDraftDate = (settings: TitlePageSettings): string => {
    const format = settings.dateFormat ?? 'mdy';

    if ((settings.draftDateMode ?? 'auto') === 'auto') {
        return formatDatePreview(getTodayIso(), format);
    }

    return settings.draftDate ? formatDatePreview(settings.draftDate, format) : '';
};

import type {
    TitlePageCredit,
    TitlePageDateFormat,
    TitlePageSettings,
} from './types';

const formatDate = (isoDate: string, format: TitlePageDateFormat): string => {
    const match = (/^(\d{4})-(\d{2})-(\d{2})/).exec(isoDate);

    if (!match) {
        return isoDate;
    }

    const [
        , year,
        month,
        day,
    ] = match;

    return format === 'dmy'
        ? `${day}/${month}/${year}`
        : `${month}/${day}/${year}`;
};

const formatAutoDate = (format: TitlePageDateFormat): string => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return format === 'dmy'
        ? `${day}/${month}/${year}`
        : `${month}/${day}/${year}`;
};

const serializeCreditEntry = (entry: TitlePageCredit): string[] => {
    const creditText = entry.credit.trim();
    const authorNames = entry.authors.map(a => a.trim()).filter(Boolean);

    if (!creditText && authorNames.length === 0) {
        return [];
    }

    const result: string[] = [];

    if (creditText) {
        result.push(serializeMultilineField('Credit', [creditText]));
    }

    if (authorNames.length > 0) {
        const authorKey = authorNames.length > 1 ? 'Authors' : 'Author';

        result.push(serializeMultilineField(authorKey, authorNames));
    }

    return result;
};

const serializeMultilineField = (key: string, lines: string[]): string => {
    const nonEmpty = lines.filter(l => l.trim().length > 0);

    if (nonEmpty.length === 0) {
        return '';
    }

    return [key + ':', ...nonEmpty.map(l => `   ${l}`)].join('\n');
};

export const serializeTitlePageToFountain = (
    settings: TitlePageSettings,
    scriptTitle: string,
): string => {
    const lines: string[] = [];
    const addField = (key: string, value: string) => {
        lines.push(`${key}: ${value}`);
    };

    const title = settings.titleOverride?.trim() || scriptTitle.trim() || 'Untitled';
    const subtitle = settings.subtitle?.trim();
    const titleLines = [`**${title}**`, ...subtitle ? [`**${subtitle}**`] : []];

    lines.push(serializeMultilineField('Title', titleLines));

    for (const entry of settings.credits ?? []) {
        for (const line of serializeCreditEntry(entry)) {
            lines.push(line);
        }
    }

    if (settings.source?.trim()) {
        addField('Source', settings.source.trim());
    }

    const dateFormat = settings.dateFormat ?? 'mdy';
    const draftDateMode = settings.draftDateMode ?? 'auto';

    if (draftDateMode === 'manual' && settings.draftDate) {
        addField('Draft date', formatDate(settings.draftDate, dateFormat));
    } else if (draftDateMode === 'auto') {
        addField('Draft date', formatAutoDate(dateFormat));
    }

    const contact = settings.contact?.trim();

    if (contact) {
        const contactLines = contact.split('\n').map(l => l.trimEnd());

        lines.push(serializeMultilineField('Contact', contactLines));
    }

    if (settings.copyright?.trim()) {
        addField('Copyright', settings.copyright.trim());
    }

    if (lines.length === 0) {
        return '';
    }

    return lines.join('\n') + '\n';
};

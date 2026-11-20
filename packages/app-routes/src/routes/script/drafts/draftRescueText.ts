import type {EditorSettingsOverride, TitlePageSettings} from '@stagistic/script';

/** Text a writer can copy by hand when a handover cannot save a draft. Readable, not JSON. */

export const titlePageRescueText = (value: TitlePageSettings): string => {
    const lines = ['Title page'];
    const field = (label: string, text: string | undefined) => {
        if (text?.trim()) {
            lines.push(`${label}: ${text.trim()}`);
        }
    };

    field('Subtitle', value.subtitle);
    value.credits?.forEach(credit => {
        const authors = credit.authors.map(author => author.trim()).filter(Boolean);

        if (authors.length > 0) {
            lines.push(`${credit.credit}: ${authors.join(', ')}`);
        }
    });
    field('Source', value.source);
    field('Draft date', value.draftDate);
    field('Contact', value.contact);
    field('Copyright', value.copyright);

    return lines.join('\n');
};

const flatten = (value: unknown, path: string, lines: string[]) => {
    if (value === undefined || value === null) {
        return;
    }

    if (typeof value === 'object') {
        Object.entries(value).forEach(([key, child]) => flatten(child, path ? `${path}.${key}` : key, lines));

        return;
    }

    lines.push(`${path}: ${value as string | number | boolean}`);
};

export const settingsRescueText = (value: EditorSettingsOverride): string => {
    const lines: string[] = [];

    flatten(value, '', lines);

    return ['Settings', ...lines].join('\n');
};

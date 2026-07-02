import type {TitlePageSettings} from '../titlePage';

export interface StagisticFrontmatterOptions {
    scriptTitle: string;
    titlePage?: TitlePageSettings;
    exportDate?: Date;
}

const yamlString = (value: string) => JSON.stringify(value);

const trimValue = (value: string | undefined) => value?.trim() ?? '';

const toLocalIsoDate = (date: Date): string => {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

export const serializeStagisticFrontmatter = ({
    scriptTitle,
    titlePage = {},
    exportDate = new Date(),
}: StagisticFrontmatterOptions): string => {
    const lines = ['---'];
    const title = trimValue(scriptTitle);

    if (title) {
        lines.push(`title: ${yamlString(title)}`);
    }

    const subtitle = trimValue(titlePage.subtitle);

    if (subtitle) {
        lines.push(`subtitle: ${yamlString(subtitle)}`);
    }

    const credits = (titlePage.credits ?? []).flatMap(({credit, authors}) => {
        const normalizedAuthors = authors.map(author => author.trim()).filter(Boolean);
        const normalizedCredit = credit.trim();

        return normalizedCredit && normalizedAuthors.length > 0
            ? [{credit: normalizedCredit, authors: normalizedAuthors}]
            : [];
    });

    if (credits.length > 0) {
        lines.push('credits:');
        credits.forEach(({credit, authors}) => {
            lines.push(`  - credit: ${yamlString(credit)}`);
            lines.push('    authors:');
            authors.forEach(author => lines.push(`      - ${yamlString(author)}`));
        });
    }

    const source = trimValue(titlePage.source);

    if (source) {
        lines.push(`source: ${yamlString(source)}`);
    }

    const draftDate =
        titlePage.draftDateMode === 'manual'
            ? trimValue(titlePage.draftDate)
            : toLocalIsoDate(exportDate);

    if (/^\d{4}-\d{2}-\d{2}$/u.test(draftDate)) {
        lines.push(`draftDate: ${draftDate}`);
    }

    const trailingScalarFields = [
        ['contact', titlePage.contact],
        ['copyright', titlePage.copyright],
    ] as const;

    trailingScalarFields.forEach(([key, rawValue]) => {
        const value = trimValue(rawValue);

        if (value) {
            lines.push(`${key}: ${yamlString(value)}`);
        }
    });

    lines.push('---');

    return lines.join('\n');
};

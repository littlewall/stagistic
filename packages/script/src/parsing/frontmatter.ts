import {isObjectRecord} from '@stagistic/shared';
import {parseDocument} from 'yaml';

import type {TitlePageCredit, TitlePageSettings} from '../titlePage';
import {StagisticParseError} from './types';

const FRONTMATTER_KEYS = new Set([
    'title',
    'subtitle',
    'credits',
    'source',
    'draftDate',
    'contact',
    'copyright',
]);

export interface ParsedFrontmatter {
    body: string,
    bodyStartLine: number,
    title?: string,
    titlePage: TitlePageSettings,
}

const readOptionalString = (source: Record<string, unknown>, key: string): string | undefined => {
    const value = source[key];

    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value !== 'string') {
        throw new StagisticParseError(`Frontmatter field "${key}" must be a string.`);
    }

    return value;
};

const readCredits = (value: unknown): TitlePageCredit[] | undefined => {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new StagisticParseError('Frontmatter field "credits" must be a list.');
    }

    return value.map((entry, index) => {
        if (!isObjectRecord(entry)) {
            throw new StagisticParseError(`Credit ${index + 1} must be an object.`);
        }

        const unknownKey = Object.keys(entry).find(key => key !== 'credit' && key !== 'authors');

        if (unknownKey) {
            throw new StagisticParseError(`Unknown credit field "${unknownKey}".`);
        }

        if (typeof entry.credit !== 'string' || entry.credit.trim().length === 0) {
            throw new StagisticParseError(`Credit ${index + 1} must have a non-empty "credit" string.`);
        }

        if (!Array.isArray(entry.authors) || entry.authors.length === 0) {
            throw new StagisticParseError(`Credit ${index + 1} must have a non-empty "authors" list.`);
        }

        const authors = entry.authors.map((author, authorIndex) => {
            if (typeof author !== 'string' || author.trim().length === 0) {
                throw new StagisticParseError(
                    `Author ${authorIndex + 1} in credit ${index + 1} must be a non-empty string.`,
                );
            }

            return author;
        });

        return {credit: entry.credit, authors};
    });
};

const toTitlePageSettings = (value: unknown): TitlePageSettings => {
    if (value === null || value === undefined) {
        return {};
    }

    if (!isObjectRecord(value)) {
        throw new StagisticParseError('Frontmatter must be a YAML object.');
    }

    const unknownKey = Object.keys(value).find(key => !FRONTMATTER_KEYS.has(key));

    if (unknownKey) {
        throw new StagisticParseError(`Unknown frontmatter field "${unknownKey}".`);
    }

    const draftDate = readOptionalString(value, 'draftDate');

    if (draftDate && !(/^\d{4}-\d{2}-\d{2}$/u).test(draftDate)) {
        throw new StagisticParseError('Frontmatter field "draftDate" must use YYYY-MM-DD.');
    }

    return {
        subtitle: readOptionalString(value, 'subtitle'),
        credits: readCredits(value.credits),
        source: readOptionalString(value, 'source'),
        draftDateMode: draftDate ? 'manual' : undefined,
        draftDate,
        contact: readOptionalString(value, 'contact'),
        copyright: readOptionalString(value, 'copyright'),
    };
};

export const parseStagisticFrontmatter = (source: string): ParsedFrontmatter => {
    const normalized = source.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n');
    const lines = normalized.split('\n');

    if (lines[0] !== '---') {
        return {
            body: normalized,
            bodyStartLine: 1,
            titlePage: {},
        };
    }

    const closingIndex = lines.findIndex((line, index) => index > 0 && line === '---');

    if (closingIndex < 0) {
        throw new StagisticParseError('Frontmatter is missing its closing --- fence.', 1);
    }

    const yamlSource = lines.slice(1, closingIndex).join('\n');
    const yamlDocument = parseDocument(yamlSource, {prettyErrors: true});

    if (yamlDocument.errors.length > 0) {
        throw new StagisticParseError(`Invalid YAML frontmatter: ${yamlDocument.errors[0].message}`);
    }

    const parsed: unknown = yamlDocument.toJS();

    return {
        body: lines.slice(closingIndex + 1).join('\n'),
        bodyStartLine: closingIndex + 2,
        title: isObjectRecord(parsed) ? readOptionalString(parsed, 'title') : undefined,
        titlePage: toTitlePageSettings(parsed),
    };
};

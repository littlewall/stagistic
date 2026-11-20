import {parse} from 'yaml';
import type {z} from 'zod';

import {ReleaseNotesError} from './errors';

const FRONT_MATTER = /^---\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n([\s\S]*))?$/;

export const formatIssues = (error: z.ZodError): string[] => error.issues.map(issue => {
    const path = issue.path.join('.');

    return path ? `${path}: ${issue.message}` : issue.message;
});

export const fail = (label: string, issues: string[]): never => {
    throw new ReleaseNotesError(`${label}: ${issues.join('; ')}`, issues);
};

/** Splits `---` delimited YAML front matter from the body. Text is the only input, so this runs in browsers too. */
export const splitFrontMatter = (source: string, label: string): {data: unknown, body: string} => {
    const match = FRONT_MATTER.exec(source.replace(/^﻿/, '').replace(/\r\n?/g, '\n'));

    if (!match) {
        return fail(label, ['missing front matter block (the file must start with --- and close it with ---)']);
    }

    let data: unknown;

    try {
        data = parse(match[1] ?? '');
    } catch (error) {
        return fail(label, [`front matter is not valid YAML (${error instanceof Error ? error.message.split('\n')[0] : String(error)})`]);
    }

    if (data !== null && (typeof data !== 'object' || Array.isArray(data))) {
        return fail(label, ['front matter must be a list of fields']);
    }

    return {data: data ?? {}, body: (match[2] ?? '').trim()};
};

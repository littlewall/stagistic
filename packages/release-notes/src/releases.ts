import {stringify} from 'yaml';

import {ReleaseNotesError} from './errors';
import {
    fail,
    formatIssues,
    splitFrontMatter,
} from './frontmatter';
import type {
    Release,
    ReleaseNote,
    ReleaseNoteFragment,
    ReleaseNoteType,
} from './schema';
import {releaseSchema} from './schema';
import {compareReleaseNumbers} from './version';

const TYPE_ORDER: Record<ReleaseNoteType, number> = {
    feature: 0,
    improvement: 1,
    fix: 2,
};

/** Merges fragments into one Release. Breaking notes come first, then features, improvements and fixes; ties keep input order. */
export const composeRelease = (options: {
    release: string,
    date: string,
    fragments: readonly ReleaseNoteFragment[],
}): Release => {
    const notes = options.fragments
        .map(({bump: _bump, ...note}): ReleaseNote => note)
        .map((note, index) => ({note, index}))
        .toSorted((a, b) => Number(b.note.breaking) - Number(a.note.breaking) || TYPE_ORDER[a.note.type] - TYPE_ORDER[b.note.type] || a.index - b.index)
        .map(({note}) => note);

    return {
        release: options.release,
        date: options.date,
        notes,
    };
};

/** The text of `releases/<release>.md`. Parsing it returns an equal Release. */
export const serializeRelease = (release: Release): string => {
    const data = {
        release: release.release,
        date: release.date,
        notes: release.notes.map(note => ({
            type: note.type,
            title: note.title,
            highlight: note.highlight,
            ...note.breaking ? {breaking: true} : {},
            ...note.image === undefined ? {} : {image: note.image},
            ...note.docs === undefined ? {} : {docs: note.docs},
            ...note.article === undefined ? {} : {article: note.article},
            ...note.surface === undefined ? {} : {surface: note.surface},
            description: note.description,
        })),
    };

    return `---\n${stringify(data, {lineWidth: 0})}---\n`;
};

/** Parses one `releases/<release>.md` file. */
export const parseRelease = (source: string, label: string): Release => {
    const {data} = splitFrontMatter(source, label);
    const result = releaseSchema.safeParse(data);

    return result.success ? result.data : fail(label, formatIssues(result.error));
};

/**
 * Parses finished Releases, newest first. Keys are file paths (for example the result of
 * `import.meta.glob`); each file must be named `<release>.md`.
 */
export const listReleases = (sources: Readonly<Record<string, string>>): Release[] => Object.entries(sources)
    .map(([path, source]) => {
        const release = parseRelease(source, path);

        if (path.split('/').pop() !== `${release.release}.md`) {
            throw new ReleaseNotesError(`${path}: the file name must be ${release.release}.md to match its Release number`);
        }

        return release;
    })
    .toSorted((a, b) => compareReleaseNumbers(b.release, a.release));

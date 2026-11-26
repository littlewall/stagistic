import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {join} from 'node:path';

import {ReleaseNotesError} from './errors';
import {parseFragment} from './fragment';
import {planReleaseNumberUpdate, readReleaseNumbers} from './releaseNumbers';
import {composeRelease, serializeRelease} from './releases';
import type {ReleaseNoteFragment} from './schema';
import {isReleaseDate} from './schema';
import {bumpRelease, highestBump} from './version';

export interface PrepareOptions {
    /** Repository root. */
    root: string,
    /** Release date, `YYYY-MM-DD`. */
    date: string,
    /** Bump to (major + 1).0.0 whatever the fragments say. */
    major?: boolean,
}

export interface PrepareResult {
    release: string,
    previous: string,
    /** Release Notes file, relative to the root. */
    file: string,
    updated: string[],
    removed: string[],
}

const FRAGMENT_DIR = 'releases/next';

const fragmentFiles = (root: string): string[] => {
    if (!existsSync(join(root, FRAGMENT_DIR))) {
        return [];
    }

    return readdirSync(join(root, FRAGMENT_DIR))
        .filter(name => name.endsWith('.md'))
        .toSorted()
        .map(name => `${FRAGMENT_DIR}/${name}`);
};

const readFragments = (root: string, files: string[]): ReleaseNoteFragment[] => {
    const problems: string[] = [];
    const fragments: ReleaseNoteFragment[] = [];

    for (const file of files) {
        try {
            fragments.push(parseFragment(readFileSync(join(root, file), 'utf8'), file));
        } catch (error) {
            if (!(error instanceof ReleaseNotesError)) {
                throw error;
            }

            problems.push(error.message);
        }
    }

    if (problems.length > 0) {
        throw new ReleaseNotesError(`Invalid Release Note fragments:\n${problems.map(problem => `  ${problem}`).join('\n')}`, problems);
    }

    return fragments;
};

/**
 * Merges `releases/next/*.md` into `releases/<release>.md`, sets every Release number and removes the
 * fragments. Everything is validated before the first write. Never touches git.
 */
export const prepareRelease = ({
    root,
    date,
    major = false,
}: PrepareOptions): PrepareResult => {
    if (!isReleaseDate(date)) {
        throw new ReleaseNotesError(`Invalid date "${date}": write a real calendar day as YYYY-MM-DD`);
    }

    const files = fragmentFiles(root);

    if (files.length === 0) {
        throw new ReleaseNotesError(`No fragments found in ${FRAGMENT_DIR}/: nothing to release. Add one Markdown file per change first.`);
    }

    const fragments = readFragments(root, files);

    const numbers = readReleaseNumbers(root);
    const previous = numbers.find(entry => entry.file === 'package.json')?.version;
    const mismatched = numbers.filter(entry => entry.version !== previous);

    if (previous === undefined || mismatched.length > 0) {
        throw new ReleaseNotesError(
            `Release numbers disagree (package.json has ${previous ?? 'none'}). Align them before preparing:\n${mismatched.map(entry => `  ${entry.file}: ${entry.version}`).join('\n')}`,
        );
    }

    const release = bumpRelease(previous, major ? 'major' : highestBump(fragments.map(fragment => fragment.bump)));
    const file = `releases/${release}.md`;

    if (existsSync(join(root, file))) {
        throw new ReleaseNotesError(`${file} already exists. Remove it or pick different fragments; nothing was changed.`);
    }

    const updates = planReleaseNumberUpdate(root, release);

    mkdirSync(join(root, 'releases'), {recursive: true});
    writeFileSync(join(root, file), serializeRelease(composeRelease({
        release,
        date,
        fragments,
    })));
    for (const [path, text] of updates) {
        writeFileSync(join(root, path), text);
    }

    for (const fragment of files) {
        rmSync(join(root, fragment));
    }

    return {
        release,
        previous,
        file,
        updated: [...updates.keys()],
        removed: files,
    };
};

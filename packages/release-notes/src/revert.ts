import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {join} from 'node:path';

import {stringify} from 'yaml';

import {ReleaseNotesError} from './errors';
import {parseFragment} from './fragment';
import {planReleaseNumberUpdate, readReleaseNumbers} from './releaseNumbers';
import {parseRelease} from './releases';
import type {Release, ReleaseNote} from './schema';
import {
    bumpRelease,
    compareReleaseNumbers,
    INITIAL_RELEASE,
    isReleaseNumber,
    type ReleaseBump,
} from './version';

export interface RevertOptions {
    /** Repository root. */
    root: string,
    /** The Release to go back to: an existing `releases/<n>.md`, or the initial version. */
    target: string,
}

export interface RevertResult {
    /** The Release number every file now carries. */
    release: string,
    previous: string,
    /** Fragments written, relative to the root. */
    written: string[],
    /** Release files deleted, relative to the root. */
    removed: string[],
    updated: string[],
    /** Releases that were major steps; prepare again with `--major` to get their number back. */
    majorReleases: string[],
}

const FRAGMENT_DIR = 'releases/next';
const RELEASE_FILE = /^(\d+\.\d+\.\d+)\.md$/;

const releaseFiles = (root: string): string[] => {
    if (!existsSync(join(root, 'releases'))) {
        return [];
    }

    return readdirSync(join(root, 'releases'), {withFileTypes: true})
        .filter(entry => entry.isFile() && RELEASE_FILE.test(entry.name))
        .map(entry => entry.name.replace(/\.md$/, ''))
        .filter(isReleaseNumber)
        .toSorted(compareReleaseNumbers);
};

/** A major step is recorded as `minor` fragments; `release-prepare --major` makes the number again. */
const bumpBetween = (from: string, to: string): {bump: ReleaseBump, major: boolean} => {
    for (const bump of ['minor', 'patch'] as const) {
        if (bumpRelease(from, bump) === to) {
            return {bump, major: false};
        }
    }

    if (bumpRelease(from, 'major') === to) {
        return {bump: 'minor', major: true};
    }

    throw new ReleaseNotesError(
        `Cannot tell how Release ${from} became ${to}: only a major, minor or patch step can be undone. Revert to the Release before ${to} instead.`,
    );
};

const slugOf = (title: string): string => title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '') || 'note';

/**
 * Unique file names; numbered when plain names would sort notes of one group (same breaking flag and
 * type, the only notes `composeRelease` keeps in file order) differently than they are listed.
 */
const fragmentNames = (items: readonly Pick<ReleaseNote, 'title' | 'type' | 'breaking'>[]): string[] => {
    const seen = new Map<string, number>();
    const names = items.map(({title}) => {
        const slug = slugOf(title);
        const count = (seen.get(slug) ?? 0) + 1;

        seen.set(slug, count);

        return count === 1 ? slug : `${slug}-${count}`;
    });
    const lastInGroup = new Map<string, string>();
    const inOrder = names.every((name, index) => {
        const group = `${items[index].breaking}/${items[index].type}`;
        const last = lastInGroup.get(group);

        lastInGroup.set(group, `${name}.md`);

        return last === undefined || last < `${name}.md`;
    });

    if (inOrder) {
        return names.map(name => `${name}.md`);
    }

    const width = String(names.length).length;

    return names.map((name, index) => `${String(index + 1).padStart(Math.max(width, 2), '0')}-${name}.md`);
};

/** The text of a `releases/next/<name>.md` file. `parseFragment` returns an equal fragment. */
const serializeFragment = (note: ReleaseNote, bump: ReleaseBump): string => {
    const data = {
        type: note.type,
        bump,
        title: note.title,
        ...note.highlight ? {highlight: true} : {},
        ...note.breaking ? {breaking: true} : {},
        ...note.image === undefined ? {} : {image: note.image},
        ...note.docs === undefined ? {} : {docs: note.docs},
        ...note.article === undefined ? {} : {article: note.article},
        ...note.surface === undefined ? {} : {surface: note.surface},
    };

    return `---\n${stringify(data, {lineWidth: 0})}---\n${note.description}\n`;
};

/**
 * Undoes `prepareRelease` back to `target`: every `releases/<n>.md` newer than it is split into
 * `releases/next/` fragments (bump from how the number changed) and deleted, and every Release number
 * is set to `target`. Everything is validated before the first write. Never touches git.
 */
export const revertRelease = ({root, target}: RevertOptions): RevertResult => {
    if (!isReleaseNumber(target)) {
        throw new ReleaseNotesError(`Invalid Release number "${target}" (expected major.minor.patch, for example 0.1.0)`);
    }

    const numbers = readReleaseNumbers(root);
    const current = numbers.find(entry => entry.file === 'package.json')?.version;
    const mismatched = numbers.filter(entry => entry.version !== current);

    if (current === undefined || mismatched.length > 0) {
        throw new ReleaseNotesError(
            `Release numbers disagree (package.json has ${current ?? 'none'}). Align them before reverting:\n${mismatched.map(entry => `  ${entry.file}: ${entry.version}`).join('\n')}`,
        );
    }

    const all = releaseFiles(root);

    if (target !== INITIAL_RELEASE && !all.includes(target)) {
        throw new ReleaseNotesError(
            `${target} is not a Release to go back to: there is no releases/${target}.md and it is not the initial version `
            + `${INITIAL_RELEASE}. Nothing was changed.`,
        );
    }

    if (compareReleaseNumbers(target, current) >= 0) {
        throw new ReleaseNotesError(`${target} is not older than the current Release ${current}. Nothing was changed.`);
    }

    const newer = all.filter(release => compareReleaseNumbers(release, target) > 0);

    if (newer.length === 0 || newer.at(-1) !== current) {
        const found = newer.length === 0 ? `no Release file is newer than ${target}` : `the newest is ${newer.at(-1)}`;

        throw new ReleaseNotesError(`The newest Release file must be the current Release ${current}, but ${found}. Nothing was changed.`);
    }

    const planned: {
        release: Release,
        bump: ReleaseBump,
        major: boolean,
    }[] = [];
    let previous = target;

    for (const number of newer) {
        const file = `releases/${number}.md`;
        const release = parseRelease(readFileSync(join(root, file), 'utf8'), file);

        if (release.release !== number) {
            throw new ReleaseNotesError(`${file}: the file name must match its Release number ${release.release}`);
        }

        planned.push({release, ...bumpBetween(previous, number)});
        previous = number;
    }

    const notes = planned.flatMap(({release, bump}) => release.notes.map(note => ({note, bump})));
    const names = fragmentNames(notes.map(({note}) => note));
    const taken = names.filter(name => existsSync(join(root, FRAGMENT_DIR, name)));

    if (taken.length > 0) {
        throw new ReleaseNotesError(`Fragment files already exist: ${taken.map(name => `${FRAGMENT_DIR}/${name}`).join(', ')}. Move or prepare them first; nothing was changed.`);
    }

    const fragments = notes.map(({note, bump}, index) => ({
        file: `${FRAGMENT_DIR}/${names[index]}`,
        text: serializeFragment(note, bump),
    }));

    for (const fragment of fragments) {
        parseFragment(fragment.text, fragment.file);
    }

    const updates = planReleaseNumberUpdate(root, target);

    mkdirSync(join(root, FRAGMENT_DIR), {recursive: true});
    for (const fragment of fragments) {
        writeFileSync(join(root, fragment.file), fragment.text);
    }

    for (const [path, text] of updates) {
        writeFileSync(join(root, path), text);
    }

    const removed = newer.map(number => `releases/${number}.md`);

    for (const file of removed) {
        rmSync(join(root, file));
    }

    return {
        release: target,
        previous: current,
        written: fragments.map(fragment => fragment.file).toSorted(),
        removed,
        updated: [...updates.keys()],
        majorReleases: planned.filter(step => step.major).map(step => step.release.release),
    };
};

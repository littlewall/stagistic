import {
    existsSync,
    readdirSync,
    readFileSync,
} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {ReleaseNotesError} from './errors';
import {listReleases} from './releases';

const RELEASES_DIR = new URL('../../../releases/', import.meta.url);

/** Throws a `ReleaseNotesError` naming the file when any finished `releases/<n>.md` is invalid. A missing directory is zero Releases. */
export const validateReleases = (directory: URL = RELEASES_DIR): number => {
    if (!existsSync(directory)) {
        return 0;
    }

    const sources = Object.fromEntries(readdirSync(directory)
        .filter(name => name.endsWith('.md'))
        .map(name => [`releases/${name}`, readFileSync(new URL(name, directory), 'utf8')]));

    return listReleases(sources).length;
};

// Run by the build plugin through tsx (`--run [directory]`): exit 1 with the reason so the build fails.
const runIndex = process.argv.indexOf('--run');

if (runIndex !== -1) {
    try {
        const directory = process.argv[runIndex + 1];

        validateReleases(directory ? pathToFileURL(`${path.resolve(directory)}${path.sep}`) : undefined);
    } catch (error) {
        console.error(error instanceof ReleaseNotesError ? error.message : error);
        process.exitCode = 1;
    }
}

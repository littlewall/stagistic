import {fileURLToPath} from 'node:url';

import {ReleaseNotesError} from './errors';
import {prepareRelease} from './prepare';
import {revertRelease} from './revert';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const today = (): string => {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
};

const parseFlags = (args: readonly string[], allowed: readonly string[]): {
    flags: Map<string, string>,
    rest: string[],
    unknown?: string,
} => {
    const flags = new Map<string, string>();
    const rest: string[] = [];

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        if (!arg.startsWith('--')) {
            rest.push(arg);
        } else if (allowed.includes(arg) && args[index + 1] !== undefined) {
            flags.set(arg, args[index + 1]);
            index++;
        } else {
            return {
                flags,
                rest,
                unknown: arg,
            };
        }
    }

    return {flags, rest};
};

const report = (action: () => string[], error: (line: string) => void, log: (line: string) => void): number => {
    try {
        for (const line of action()) {
            log(line);
        }

        return 0;
    } catch (caught) {
        if (caught instanceof ReleaseNotesError) {
            error(caught.message);

            return 1;
        }

        throw caught;
    }
};

/** `release-prepare [--major] [--date YYYY-MM-DD] [--root DIR]`. Returns the exit code. */
export const runCli = (args: readonly string[], log: (line: string) => void = console.log, error: (line: string) => void = console.error): number => {
    const major = args.includes('--major');
    const {
        flags,
        rest,
        unknown,
    } = parseFlags(args.filter(arg => arg !== '--major'), ['--date', '--root']);

    if (unknown !== undefined || rest.length > 0) {
        error(`Unknown argument "${unknown ?? rest[0]}". Usage: release-prepare [--major] [--date YYYY-MM-DD] [--root DIR]`);

        return 2;
    }

    const date = flags.get('--date') ?? today();
    const root = flags.get('--root') ?? REPOSITORY_ROOT;

    return report(() => {
        const result = prepareRelease({
            root,
            date,
            major,
        });

        return [
            `Prepared Release ${result.release} (was ${result.previous}) dated ${date}.`,
            `Wrote ${result.file}; updated ${result.updated.length} files; removed ${result.removed.length} fragments.`,
            'Nothing was committed or tagged. Review the changes, then commit and tag yourself.',
        ];
    }, error, log);
};

/** `release-revert <release> [--root DIR]`. Returns the exit code. */
export const runRevertCli = (args: readonly string[], log: (line: string) => void = console.log, error: (line: string) => void = console.error): number => {
    const {
        flags,
        rest,
        unknown,
    } = parseFlags(args, ['--root']);

    if (unknown !== undefined || rest.length !== 1) {
        error(`${unknown === undefined ? 'Give exactly one Release to go back to' : `Unknown argument "${unknown}"`}. Usage: release-revert <release> [--root DIR]`);

        return 2;
    }

    const root = flags.get('--root') ?? REPOSITORY_ROOT;

    return report(() => {
        const result = revertRelease({root, target: rest[0]});

        const major = result.majorReleases.length > 0
            ? [`Release ${result.majorReleases.join(', ')} was a major step: prepare again with --major.`]
            : [];

        return [
            `Reverted to Release ${result.release} (was ${result.previous}).`,
            `Wrote ${result.written.length} fragments (${result.written.join(', ')}); removed ${result.removed.join(', ')}; updated ${result.updated.length} files.`,
            ...major,
            'Nothing was committed or tagged. Review the changes before you commit.',
        ];
    }, error, log);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [command, ...rest] = process.argv.slice(2);

    // `release-revert` runs this file with a leading `revert`; `release-prepare` passes only its flags.
    process.exitCode = command === 'revert' ? runRevertCli(rest) : runCli(process.argv.slice(2));
}

import {
    existsSync,
    readdirSync,
    readFileSync,
} from 'node:fs';
import {join} from 'node:path';

export interface ReleaseNumberFile {
    /** Path relative to the repository root, with `/` separators. */
    file: string,
    version: string,
}

interface Target {
    file: string,
    read(text: string): string | undefined,
    write(text: string, version: string): string,
}

const TAURI_DIR = 'apps/desktop/src-tauri';

const jsonTarget = (file: string): Target => {
    const pattern = /^(\s*"version"\s*:\s*")([^"]*)(")/m;

    return {
        file,
        read(text) {
            const declared = (JSON.parse(text) as {version?: unknown}).version;
            const found = pattern.exec(text)?.[2];

            return typeof declared === 'string' && declared === found ? declared : undefined;
        },
        write: (text, version) => text.replace(pattern, `$1${version}$3`),
    };
};

/** Finds the `version = "..."` line inside the first `[package]` block (`kind: 'toml'`) or of the named crate (`kind: 'lock'`). */
const findVersionLine = (text: string, match: {kind: 'toml'} | {kind: 'lock', crate: string}): {index: number, version: string} | undefined => {
    const lines = text.split('\n');
    let inBlock = false;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];

        if ((/^\[{1,2}[^\]]+\]{1,2}\s*$/).test(line)) {
            inBlock = match.kind === 'toml' ? line.trim() === '[package]' : false;
            continue;
        }

        if (match.kind === 'lock' && line === `name = "${match.crate}"`) {
            inBlock = true;
            continue;
        }

        const version = inBlock ? (/^version\s*=\s*"([^"]*)"\s*$/).exec(line)?.[1] : undefined;

        if (version !== undefined) {
            return {index, version};
        }
    }

    return undefined;
};

const tomlTarget = (file: string, match: {kind: 'toml'} | {kind: 'lock', crate: string}): Target => {
    return {
        file,
        read: text => findVersionLine(text, match)?.version,
        write(text, version) {
            const found = findVersionLine(text, match);

            if (!found) {
                return text;
            }

            const lines = text.split('\n');

            lines[found.index] = `version = "${version}"`;

            return lines.join('\n');
        },
    };
};

const crateName = (root: string): string | undefined => (/^name\s*=\s*"([^"]+)"/m).exec(readFileSync(join(root, TAURI_DIR, 'Cargo.toml'), 'utf8'))?.[1];

const packageJsonFiles = (root: string): string[] => {
    const files = ['package.json'];

    for (const dir of ['apps', 'packages']) {
        if (!existsSync(join(root, dir))) {
            continue;
        }

        for (const entry of readdirSync(join(root, dir), {withFileTypes: true}).toSorted((a, b) => a.name.localeCompare(b.name))) {
            const file = `${dir}/${entry.name}/package.json`;

            if (entry.isDirectory() && existsSync(join(root, file))) {
                files.push(file);
            }
        }
    }

    return files;
};

const targets = (root: string): Target[] => {
    const list = packageJsonFiles(root)
        .filter(file => typeof (JSON.parse(readFileSync(join(root, file), 'utf8')) as {version?: unknown}).version === 'string')
        .map(jsonTarget);

    if (existsSync(join(root, TAURI_DIR, 'tauri.conf.json'))) {
        list.push(jsonTarget(`${TAURI_DIR}/tauri.conf.json`));
    }

    if (existsSync(join(root, TAURI_DIR, 'Cargo.toml'))) {
        list.push(tomlTarget(`${TAURI_DIR}/Cargo.toml`, {kind: 'toml'}));

        const crate = crateName(root);

        if (crate && existsSync(join(root, TAURI_DIR, 'Cargo.lock'))) {
            list.push(tomlTarget(`${TAURI_DIR}/Cargo.lock`, {kind: 'lock', crate}));
        }
    }

    return list;
};

/** The Release number in every file that carries one. A file whose number cannot be read reports `unreadable`. */
export const readReleaseNumbers = (root: string): ReleaseNumberFile[] => targets(root).map(target => ({
    file: target.file,
    version: target.read(readFileSync(join(root, target.file), 'utf8')) ?? 'unreadable',
}));

/** The new text of every file whose number is replaced; nothing is written. */
export const planReleaseNumberUpdate = (root: string, version: string): Map<string, string> => {
    const updates = new Map<string, string>();

    for (const target of targets(root)) {
        updates.set(target.file, target.write(readFileSync(join(root, target.file), 'utf8'), version));
    }

    return updates;
};

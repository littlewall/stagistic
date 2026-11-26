import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseRelease, ReleaseNotesError} from './index';
import {prepareRelease, readReleaseNumbers} from './node';

const roots: string[] = [];

const packageJson = (version: string) => `{\n    "name": "pkg",\n    "version": "${version}",\n    "dependencies": {\n        "left-pad": "1.0.0"\n    }\n}\n`;
const tauriConf = (version: string) => `{\n    "productName": "Stagistic",\n    "version": "${version}",\n    "identifier": "x"\n}\n`;
const cargoToml = (version: string) => [
    '[package]',
    'name = "stagistic-editor"',
    `version = "${version}"`,
    'edition = "2021"',
    '',
    '[dependencies]',
    'serde = { version = "1.0" }',
    '',
].join('\n');
const cargoLock = (version: string) => [
    'version = 4',
    '',
    '[[package]]',
    'name = "serde"',
    'version = "1.0.0"',
    '',
    '[[package]]',
    'name = "stagistic-editor"',
    `version = "${version}"`,
    'dependencies = [',
    ' "serde",',
    ']',
    '',
].join('\n');

const fragmentFile = (type: string, bump: string, title: string, extra = '') => `---\ntype: ${type}\nbump: ${bump}\ntitle: ${title}\n${extra}---\nDescription of ${title}.\n`;

const makeRepo = (options: {
    version?: string,
    cargoVersion?: string,
    files?: Record<string, string>,
} = {}) => {
    const version = options.version ?? '0.1.0';
    const root = mkdtempSync(join(tmpdir(), 'release-notes-'));

    roots.push(root);

    const files: Record<string, string> = {
        'package.json': packageJson(version),
        'apps/web/package.json': packageJson(version),
        'apps/desktop/package.json': packageJson(version),
        'packages/shared/package.json': packageJson(version),
        'apps/desktop/src-tauri/tauri.conf.json': tauriConf(version),
        'apps/desktop/src-tauri/Cargo.toml': cargoToml(options.cargoVersion ?? version),
        'apps/desktop/src-tauri/Cargo.lock': cargoLock(options.cargoVersion ?? version),
        ...options.files,
    };

    for (const [path, content] of Object.entries(files)) {
        mkdirSync(dirname(join(root, path)), {recursive: true});
        writeFileSync(join(root, path), content);
    }

    return root;
};

const read = (root: string, path: string) => readFileSync(join(root, path), 'utf8');
const snapshot = (root: string) => {
    const out: Record<string, string> = {};
    const walk = (dir: string) => {
        for (const entry of readdirSync(join(root, dir), {withFileTypes: true})) {
            const path = join(dir, entry.name);

            if (entry.isDirectory()) {
                walk(path);
            } else {
                out[path] = read(root, path);
            }
        }
    };

    walk('.');

    return out;
};

afterEach(() => {
    for (const root of roots.splice(0)) {
        rmSync(root, {recursive: true, force: true});
    }
});

describe('prepareRelease', () => {
    it('merges fragments into releases/<release>.md and removes them', () => {
        const root = makeRepo({
            files: {
                'releases/next/templates.md': fragmentFile('feature', 'minor', 'Templates', 'highlight: true\n'),
                'releases/next/export-fix.md': fragmentFile('fix', 'patch', 'Export fix'),
            },
        });

        const result = prepareRelease({root, date: '2026-11-06'});

        expect(result.release).toBe('0.2.0');

        const release = parseRelease(read(root, 'releases/0.2.0.md'), 'releases/0.2.0.md');

        expect(release.date).toBe('2026-11-06');
        expect(release.notes.map(note => [
            note.type,
            note.title,
            note.highlight,
        ])).toEqual([
            [
                'feature',
                'Templates',
                true,
            ],
            [
                'fix',
                'Export fix',
                false,
            ],
        ]);
        expect(existsSync(join(root, 'releases/next/templates.md'))).toBe(false);
        expect(existsSync(join(root, 'releases/next/export-fix.md'))).toBe(false);
    });

    it('keeps the release directory for the next fragments', () => {
        const root = makeRepo({files: {'releases/next/a.md': fragmentFile('fix', 'patch', 'A'), 'releases/next/.gitkeep': ''}});

        prepareRelease({root, date: '2026-11-06'});
        expect(existsSync(join(root, 'releases/next/.gitkeep'))).toBe(true);
    });

    it('uses a patch number when no fragment asks for more', () => {
        const root = makeRepo({files: {'releases/next/a.md': fragmentFile('fix', 'patch', 'A')}});

        expect(prepareRelease({root, date: '2026-11-06'}).release).toBe('0.1.1');
        expect(existsSync(join(root, 'releases/0.1.1.md'))).toBe(true);
    });

    it('updates every package.json, tauri.conf.json, Cargo.toml and Cargo.lock and nothing else', () => {
        const root = makeRepo({files: {'releases/next/a.md': fragmentFile('feature', 'minor', 'A')}});
        const before = snapshot(root);

        const result = prepareRelease({root, date: '2026-11-06'});

        for (const path of [
            'package.json',
            'apps/web/package.json',
            'apps/desktop/package.json',
            'packages/shared/package.json',
            'apps/desktop/src-tauri/tauri.conf.json',
            'apps/desktop/src-tauri/Cargo.toml',
            'apps/desktop/src-tauri/Cargo.lock',
        ]) {
            expect(read(root, path), path).toBe(before[path].replace('0.1.0', '0.2.0'));
            expect(result.updated).toContain(path);
        }

        expect(read(root, 'apps/desktop/src-tauri/Cargo.toml')).toContain('serde = { version = "1.0" }');
        expect(read(root, 'apps/desktop/src-tauri/Cargo.lock')).toContain('name = "serde"\nversion = "1.0.0"');
        expect(readReleaseNumbers(root).map(entry => entry.version)).toEqual(Array(7).fill('0.2.0'));
    });

    it('fails when there are no fragments, changing nothing', () => {
        const root = makeRepo({files: {'releases/next/.gitkeep': ''}});
        const before = snapshot(root);

        expect(() => prepareRelease({root, date: '2026-11-06'})).toThrow(/no fragments/i);
        expect(snapshot(root)).toEqual(before);
    });

    it('fails when releases/next does not exist', () => {
        const root = makeRepo();

        expect(() => prepareRelease({root, date: '2026-11-06'})).toThrow(/no fragments/i);
    });

    it('lists every invalid fragment and changes nothing', () => {
        const root = makeRepo({
            files: {
                'releases/next/ok.md': fragmentFile('feature', 'minor', 'Ok'),
                'releases/next/bad-type.md': fragmentFile('chore', 'minor', 'Bad'),
                'releases/next/no-front-matter.md': 'Just text\n',
            },
        });
        const before = snapshot(root);

        let error: unknown;

        try {
            prepareRelease({root, date: '2026-11-06'});
        } catch (caught) {
            error = caught;
        }

        expect(error).toBeInstanceOf(ReleaseNotesError);
        expect((error as Error).message).toContain('bad-type.md');
        expect((error as Error).message).toContain('no-front-matter.md');
        expect((error as Error).message).not.toContain('ok.md');
        expect(snapshot(root)).toEqual(before);
    });

    it('fails when the target Release file already exists, changing nothing', () => {
        const root = makeRepo({files: {'releases/next/a.md': fragmentFile('feature', 'minor', 'A'), 'releases/0.2.0.md': 'existing\n'}});
        const before = snapshot(root);

        expect(() => prepareRelease({root, date: '2026-11-06'})).toThrow(/releases\/0\.2\.0\.md already exists/);
        expect(snapshot(root)).toEqual(before);
    });

    it('fails when the files disagree about the current number, naming them', () => {
        const root = makeRepo({cargoVersion: '0.0.1', files: {'releases/next/a.md': fragmentFile('feature', 'minor', 'A')}});
        const before = snapshot(root);
        let message = '';

        try {
            prepareRelease({root, date: '2026-11-06'});
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).toContain('apps/desktop/src-tauri/Cargo.toml');
        expect(message).toContain('0.0.1');
        expect(snapshot(root)).toEqual(before);
    });

    it('--major turns 0.2.2 into 1.0.0 in every file, whatever the fragments say', () => {
        const root = makeRepo({version: '0.2.2', files: {'releases/next/a.md': fragmentFile('fix', 'patch', 'A', 'surface: desktop\n')}});
        const result = prepareRelease({
            root,
            date: '2026-11-06',
            major: true,
        });

        expect(result.release).toBe('1.0.0');
        expect(readReleaseNumbers(root).every(entry => entry.version === '1.0.0')).toBe(true);
        expect(parseRelease(readFileSync(join(root, 'releases/1.0.0.md'), 'utf8'), 'x').notes[0].surface).toBe('desktop');
    });

    it('rejects a malformed date', () => {
        const root = makeRepo({files: {'releases/next/a.md': fragmentFile('fix', 'patch', 'A')}});

        expect(() => prepareRelease({root, date: '06.11.2026'})).toThrow(/date/);
    });
});

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

import {
    parseFragment,
    ReleaseNotesError,
} from './index';
import {
    prepareRelease,
    readReleaseNumbers,
    revertRelease,
} from './node';

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
const listing = (root: string, dir: string) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).toSorted() : []);

afterEach(() => {
    for (const root of roots.splice(0)) {
        rmSync(root, {recursive: true, force: true});
    }
});

const prepared = (files: Record<string, string>, version = '0.1.0') => {
    const root = makeRepo({version, files});

    prepareRelease({root, date: '2026-11-06'});

    return root;
};

describe('revertRelease', () => {
    it('turns a prepared Release back into fragments and restores every Release number', () => {
        const root = prepared({
            'releases/next/templates.md': fragmentFile('feature', 'minor', 'Templates', 'highlight: true\nbreaking: true\ndocs: /guide/templates\n'),
            'releases/next/export-fix.md': fragmentFile('fix', 'patch', 'Export fix'),
        });
        const result = revertRelease({root, target: '0.1.0'});

        expect(result.release).toBe('0.1.0');
        expect(read(root, 'package.json')).toContain('"version": "0.1.0"');
        expect(read(root, 'apps/desktop/src-tauri/Cargo.toml')).toContain('version = "0.1.0"');
        expect(read(root, 'apps/desktop/src-tauri/Cargo.lock')).toContain('name = "stagistic-editor"\nversion = "0.1.0"');
        expect(readReleaseNumbers(root).every(entry => entry.version === '0.1.0')).toBe(true);
        expect(existsSync(join(root, 'releases/0.2.0.md'))).toBe(false);
        expect(listing(root, 'releases/next')).toEqual(['export-fix.md', 'templates.md']);

        const templates = parseFragment(read(root, 'releases/next/templates.md'), 'templates.md');

        expect(templates).toMatchObject({
            type: 'feature',
            bump: 'minor',
            title: 'Templates',
            highlight: true,
            breaking: true,
            docs: '/guide/templates',
            description: 'Description of Templates.',
        });
        expect(parseFragment(read(root, 'releases/next/export-fix.md'), 'export-fix.md').bump).toBe('minor');
        expect(result.written).toEqual(['releases/next/export-fix.md', 'releases/next/templates.md']);
        expect(result.removed).toEqual(['releases/0.2.0.md']);
    });

    it('round-trips: preparing again gives the same Release file apart from its date', () => {
        const root = prepared({
            'releases/next/b-board.md': fragmentFile('feature', 'minor', 'Board', 'highlight: true\n'),
            'releases/next/a-fix.md': fragmentFile('fix', 'patch', 'Fix a'),
            'releases/next/c-fix.md': fragmentFile('fix', 'patch', 'Another fix'),
            'releases/next/d-tweak.md': fragmentFile('improvement', 'patch', 'Tweak'),
        });
        const first = read(root, 'releases/0.2.0.md');

        revertRelease({root, target: '0.1.0'});
        prepareRelease({root, date: '2026-11-06'});

        expect(read(root, 'releases/0.2.0.md')).toBe(first);
    });

    it('gives a patch Release back a patch bump', () => {
        const root = prepared({'releases/next/a.md': fragmentFile('fix', 'patch', 'A')});

        revertRelease({root, target: '0.1.0'});

        expect(parseFragment(read(root, 'releases/next/a.md'), 'a.md').bump).toBe('patch');
        expect(readReleaseNumbers(root).every(entry => entry.version === '0.1.0')).toBe(true);
    });

    it('reverts several Releases at once to an older Release file', () => {
        const root = prepared({'releases/next/a.md': fragmentFile('feature', 'minor', 'A')});

        writeFileSync(join(root, 'releases/next/b.md'), fragmentFile('fix', 'patch', 'B'));
        prepareRelease({root, date: '2026-11-07'});
        writeFileSync(join(root, 'releases/next/c.md'), fragmentFile('feature', 'minor', 'C'));
        prepareRelease({root, date: '2026-11-08'});

        const result = revertRelease({root, target: '0.2.0'});

        expect(result.removed).toEqual(['releases/0.2.1.md', 'releases/0.3.0.md']);
        expect(existsSync(join(root, 'releases/0.2.0.md'))).toBe(true);
        expect(readReleaseNumbers(root).every(entry => entry.version === '0.2.0')).toBe(true);
        expect(listing(root, 'releases/next')).toEqual(['b.md', 'c.md']);
        expect(parseFragment(read(root, 'releases/next/b.md'), 'b.md').bump).toBe('patch');
        expect(parseFragment(read(root, 'releases/next/c.md'), 'c.md').bump).toBe('minor');
    });

    it('keeps note order by numbering fragments when names alone would reorder them', () => {
        const root = prepared({
            'releases/next/a.md': fragmentFile('fix', 'patch', 'Zebra'),
            'releases/next/b.md': fragmentFile('fix', 'patch', 'Apple'),
        });
        const first = read(root, 'releases/0.1.1.md');

        revertRelease({root, target: '0.1.0'});
        prepareRelease({root, date: '2026-11-06'});

        expect(read(root, 'releases/0.1.1.md')).toBe(first);
    });

    const refusal = (root: string, target: string) => {
        const before = snapshotOf(root);

        expect(() => revertRelease({root, target})).toThrow(ReleaseNotesError);
        expect(snapshotOf(root)).toEqual(before);
    };

    const snapshotOf = (root: string) => [
        ...listing(root, 'releases'),
        ...listing(root, 'releases/next'),
        read(root, 'package.json'),
    ];

    it('refuses a target that is not a Release file or the initial version', () => {
        const root = prepared({'releases/next/a.md': fragmentFile('feature', 'minor', 'A')});

        refusal(root, '0.1.5');
        refusal(root, 'nonsense');
    });

    it('refuses a target that is not older than the current Release', () => {
        const root = prepared({'releases/next/a.md': fragmentFile('feature', 'minor', 'A')});

        refusal(root, '0.2.0');
        refusal(root, '0.3.0');
    });

    it('refuses when a fragment file name already exists', () => {
        const root = prepared({'releases/next/a.md': fragmentFile('feature', 'minor', 'A')});

        writeFileSync(join(root, 'releases/next/a.md'), fragmentFile('fix', 'patch', 'Other'));
        refusal(root, '0.1.0');
    });

    it('refuses when the Release numbers disagree', () => {
        const root = prepared({'releases/next/a.md': fragmentFile('feature', 'minor', 'A')});

        writeFileSync(join(root, 'apps/web/package.json'), packageJson('0.9.0'));
        refusal(root, '0.1.0');
    });
});

describe('revertRelease across a major step', () => {
    it('0.2.2 -> 1.0.0 reverts to minor fragments and --major prepares the same Release again', () => {
        const root = makeRepo({
            version: '0.2.2',
            files: {
                'releases/next/a.md': fragmentFile('feature', 'patch', 'Mac thing', 'surface: desktop\nhighlight: true\n'),
                'releases/next/b.md': fragmentFile('fix', 'patch', 'Other'),
            },
        });

        prepareRelease({
            root,
            date: '2026-11-06',
            major: true,
        });

        const first = readFileSync(join(root, 'releases/1.0.0.md'), 'utf8');

        // 0.2.2 needs its own Release file to be a revert target.
        writeFileSync(join(root, 'releases/0.2.2.md'), '---\nrelease: 0.2.2\ndate: 2026-11-01\nnotes:\n  - type: fix\n    title: Old\n    highlight: false\n    description: Old.\n---\n');

        const result = revertRelease({root, target: '0.2.2'});

        expect(result.majorReleases).toEqual(['1.0.0']);
        expect(existsSync(join(root, 'releases/1.0.0.md'))).toBe(false);
        expect(readFileSync(join(root, 'releases/next/mac-thing.md'), 'utf8')).toContain('bump: minor');
        expect(readFileSync(join(root, 'releases/next/mac-thing.md'), 'utf8')).toContain('surface: desktop');

        prepareRelease({
            root,
            date: '2026-11-06',
            major: true,
        });
        expect(readFileSync(join(root, 'releases/1.0.0.md'), 'utf8')).toBe(first);
    });
});

describe('runRevertCli', () => {
    it('reverts a repository given by --root and reports what changed', async () => {
        const {runRevertCli} = await import('./cli');
        const root = prepared({'releases/next/a.md': fragmentFile('feature', 'minor', 'A')});
        const lines: string[] = [];

        expect(runRevertCli([
            '0.1.0',
            '--root',
            root,
        ], line => lines.push(line))).toBe(0);
        expect(lines.join('\n')).toContain('Reverted to Release 0.1.0 (was 0.2.0)');
        expect(listing(root, 'releases/next')).toEqual(['a.md']);
    });

    it('exits 1 with a message when refused and 2 for a wrong call', async () => {
        const {runRevertCli} = await import('./cli');
        const root = prepared({'releases/next/a.md': fragmentFile('feature', 'minor', 'A')});
        const errors: string[] = [];

        expect(runRevertCli([
            '0.2.0',
            '--root',
            root,
        ], () => {}, line => errors.push(line))).toBe(1);
        expect(runRevertCli([], () => {}, line => errors.push(line))).toBe(2);
        expect(errors[0]).toContain('not older');
    });
});

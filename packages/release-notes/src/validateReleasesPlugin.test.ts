import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {validateReleases} from './validateReleases';
import {
    runValidateReleases,
    validateReleasesNodeArgs,
    validateReleasesPlugin,
} from './validateReleasesPlugin';

describe('validateReleases', () => {
    it('passes for the repository Releases', () => {
        expect(() => validateReleases()).not.toThrow();
    });

    it('counts a missing releases directory as zero Releases', () => {
        const missing = path.join(mkdtempSync(path.join(tmpdir(), 'releases-')), 'releases');

        expect(validateReleases(pathToFileURL(`${missing}/`))).toBe(0);
    });

    it('names the file of an invalid Release', () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'releases-'));

        writeFileSync(path.join(directory, '0.1.0.md'), '---\nrelease: nope\n---\n');

        expect(() => validateReleases(pathToFileURL(`${directory}/`))).toThrow('0.1.0.md');
    });
});

describe('validateReleasesNodeArgs', () => {
    it('passes the tsx loader to --import as a file URL, which Windows needs', () => {
        const args = validateReleasesNodeArgs();
        const loader = args[args.indexOf('--import') + 1];

        expect(loader).toMatch(/^file:\/\/\//);
    });
});

describe('validateReleasesPlugin', () => {
    it('fails the build with the reason when the check fails', () => {
        const plugin = validateReleasesPlugin(() => {
            throw new Error('0.1.0.md: bad');
        });

        expect(() => plugin.buildStart()).toThrow('Invalid Release file');
    });

    it('lets a valid set through', () => {
        expect(() => validateReleasesPlugin(() => {}).buildStart()).not.toThrow();
    });

    it('runs the real check through tsx', () => {
        expect(() => validateReleasesPlugin().buildStart()).not.toThrow();
    });

    it('fails through the real tsx path on an invalid file', () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'releases-'));

        writeFileSync(path.join(directory, '0.1.0.md'), '---\nrelease: nope\n---\n');

        expect(() => runValidateReleases(directory)).toThrow('0.1.0.md');
        expect(() => validateReleasesPlugin(() => runValidateReleases(directory)).buildStart()).toThrow('Invalid Release file');
    });

    it('passes through the real tsx path on a missing directory', () => {
        expect(() => runValidateReleases(path.join(tmpdir(), 'no-such-releases-dir'))).not.toThrow();
    });
});

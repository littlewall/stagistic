import {
    mkdir,
    mkdtemp,
    writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {collectNpmLicenses} from './npmLicenses.mjs';

const writePackage = async (root: string, name: string, pkg: Record<string, unknown>, files: Record<string, string> = {}) => {
    const directory = path.join(root, 'node_modules', name);

    await mkdir(directory, {recursive: true});
    await writeFile(path.join(directory, 'package.json'), JSON.stringify({
        name,
        version: '1.0.0',
        ...pkg,
    }));
    await Promise.all(Object.entries(files).map(([file, text]) => writeFile(path.join(directory, file), text)));
};

describe('collectNpmLicenses', () => {
    it('lists production dependencies transitively with their license text, skipping workspace packages', async () => {
        const root = await mkdtemp(path.join(tmpdir(), 'licenses-'));

        await writeFile(path.join(root, 'package.json'), JSON.stringify({
            name: 'app',
            version: '0.0.0',
            dependencies: {a: '^1', ui: 'workspace:*'},
            devDependencies: {dev: '^1'},
        }));
        await writePackage(root, 'a', {license: 'MIT', dependencies: {b: '^1'}}, {LICENSE: 'MIT text of a'});
        await writePackage(root, 'b', {license: 'ISC'}, {'LICENSE.md': 'ISC text of b'});
        await writePackage(root, 'ui', {license: 'UNLICENSED', dependencies: {c: '^1'}});
        await writePackage(root, 'c', {license: 'Apache-2.0'});
        await writePackage(root, 'dev', {license: 'MIT'}, {LICENSE: 'dev text'});

        const notices = await collectNpmLicenses(root);

        expect(notices).toEqual([
            'a@1.0.0 (MIT)\nMIT text of a',
            'b@1.0.0 (ISC)\nISC text of b',
            'c@1.0.0 (Apache-2.0)\nNo license file is shipped in this package. Declared license: Apache-2.0.',
        ]);
    });

    it('fails when a dependency cannot be resolved', async () => {
        const root = await mkdtemp(path.join(tmpdir(), 'licenses-'));

        await writeFile(path.join(root, 'package.json'), JSON.stringify({
            name: 'app',
            version: '0',
            dependencies: {missing: '^1'},
        }));
        await expect(collectNpmLicenses(root)).rejects.toThrow('Cannot resolve missing');
    });
});

import {readFileSync} from 'node:fs';

import {currentDbGeneration, formatDbGeneration} from '@stagistic/db/db-generation';
import {readDbGeneration, versionManifestPlugin} from '@stagistic/vite-config/version-manifest';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseVersionManifest} from './index';

const emit = () => {
    const emitted: {
        fileName: string,
        type: string,
        source: string,
    }[] = [];

    versionManifestPlugin().generateBundle.call({emitFile: file => emitted.push(file)});

    return emitted;
};

describe('version manifest plugin', () => {
    it('emits version.json with the root Release number and the app\'s own database generation', () => {
        const rootVersion = (JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {version: string}).version;
        const [file] = emit();

        expect(emit()).toHaveLength(1);
        expect(file).toMatchObject({type: 'asset', fileName: 'version.json'});
        expect(parseVersionManifest(file.source)).toEqual({
            release: rootVersion,
            dbGeneration: formatDbGeneration(currentDbGeneration),
        });
    });

    it('reads the same generation the database layer computes', () => {
        expect(readDbGeneration()).toBe(formatDbGeneration(currentDbGeneration));
    });

    it('only runs in a build', () => {
        expect(versionManifestPlugin().apply).toBe('build');
    });

    it('is served fresh: the web build ships a _headers rule that stops caching version.json', () => {
        const headers = readFileSync(new URL('../../../apps/web/public/_headers', import.meta.url), 'utf8');

        expect(headers).toMatch(/^\/version\.json\n\s+Cache-Control: no-store$/m);
    });
});

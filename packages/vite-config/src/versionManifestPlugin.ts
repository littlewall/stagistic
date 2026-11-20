import {readFileSync} from 'node:fs';

/*
 * Vite loads this package with plain Node, which cannot follow the extensionless TypeScript imports
 * of the other workspace packages. So the numbers are read from the files the app itself is built
 * from; the test next to this file checks them against the app's own modules.
 */
const REPOSITORY_ROOT = new URL('../../../', import.meta.url);
const COMPILED_MIGRATIONS = 'packages/db/src/pglite/migrations.compiled.ts';

/** The root `package.json` version: what the footer shows and what the prepare command keeps in step. */
export const readReleaseNumber = (root = REPOSITORY_ROOT): string => {
    const {version} = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as {version?: unknown};

    if (typeof version !== 'string') {
        throw new TypeError('The root package.json has no version');
    }

    return version;
};

/** `migrationCount/latestMigrationId/pgliteVersion`, as the database layer formats its generation. */
export const readDbGeneration = (root = REPOSITORY_ROOT): string => {
    const compiled = readFileSync(new URL(COMPILED_MIGRATIONS, root), 'utf8');
    const ids = [...compiled.matchAll(/^\s+"id": "([^"]+)",?$/gm)].map(match => match[1]);
    const pgliteVersion = (/^export const compiledPgliteVersion = "([^"]+)";$/m).exec(compiled)?.[1];

    if (ids.length === 0 || !pgliteVersion) {
        throw new Error(`Cannot read the database generation from ${COMPILED_MIGRATIONS}`);
    }

    return `${ids.length}/${ids.at(-1)}/${pgliteVersion}`;
};

interface BundleEmitter {
    emitFile: (file: {
        type: 'asset',
        fileName: string,
        source: string,
    }) => unknown,
}

/**
 * Emits `version.json` into the build output: the Release number and the database generation the
 * build needs. A tab of an older build fetches it to learn a newer Release is deployed. Web only:
 * the desktop app has no deployment.
 */
export const versionManifestPlugin = (root = REPOSITORY_ROOT) => ({
    name: 'stagistic-version-manifest',
    apply: 'build' as const,
    generateBundle(this: BundleEmitter) {
        this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: `${JSON.stringify({release: readReleaseNumber(root), dbGeneration: readDbGeneration(root)}, null, 4)}\n`,
        });
    },
});

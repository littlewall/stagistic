/// <reference types="vite-plus/client" />
import {version} from '../../../package.json';
import {listReleases} from './releases';
import type {Release} from './schema';

/*
 * Finished Releases (`releases/*.md` at the repository root), bundled as text at build time so they
 * work offline. Needs a Vite-based build (the apps, Astro, Vitest). Node scripts import
 * `@stagistic/release-notes` and `@stagistic/release-notes/node` instead.
 */
const sources = import.meta.glob<string>('../../../releases/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
});

/** Every finished Release, newest first. Empty until the first Release is prepared. */
export const releases: Release[] = (() => {
    try {
        return listReleases(sources);
    } catch (error) {
        /*
         * A hand-edited `releases/<n>.md` must not blank the app at startup; it is reported and
         * the changelog degrades to empty. The prepare command and `release-notes:test` catch it first.
         */
        console.error('[release-notes] Invalid Release files; the changelog will be empty.', error);

        return [];
    }
})();

/** The Release number the app is built as: the root `package.json` version, which the prepare command keeps in step with every other Release number. */
export const currentReleaseNumber: string = version;

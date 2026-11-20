import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

/*
 * Vite loads config with plain Node, which cannot follow this package's extensionless TypeScript
 * imports, so the check runs in a Node child process with the tsx loader. Only imports from node: here.
 */
const SCRIPT = fileURLToPath(new URL('./validateReleases.ts', import.meta.url));

/** Node arguments of the check; the loader is a file URL because Windows reads `C:\\...` as a URL scheme. */
export const validateReleasesNodeArgs = (directory?: string): string[] => {
    const tsx = createRequire(import.meta.url).resolve('tsx');

    return [
        '--import',
        pathToFileURL(tsx).href,
        SCRIPT,
        '--run',
        ...directory ? [directory] : [],
    ];
};

/** Runs the check in a child process; throws with the child's stderr when it fails. `directory` defaults to the repository's `releases/`. */
export const runValidateReleases = (directory?: string): void => {
    execFileSync(process.execPath, validateReleasesNodeArgs(directory), {stdio: 'pipe', encoding: 'utf8'});
};

/** Fails a production build when a `releases/<n>.md` is invalid, instead of shipping a changelog that silently is empty. */
export const validateReleasesPlugin = (run: () => void = () => runValidateReleases()) => ({
    name: 'stagistic-validate-releases',
    apply: 'build' as const,
    buildStart() {
        try {
            run();
        } catch (error) {
            const detail = (error as {stderr?: string}).stderr?.trim() || String(error);

            throw new Error(`Invalid Release file. ${detail}`, {cause: error});
        }
    },
});

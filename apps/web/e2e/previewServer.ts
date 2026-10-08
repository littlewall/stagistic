import {type ChildProcess, spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));

/** Serves the last `vp build` output; the moon task builds first. */
export const startPreviewServer = async (port: number): Promise<{url: string, stop: () => void}> => {
    const server: ChildProcess = spawn('pnpm', [
        'exec',
        'vp',
        'preview',
        '--port',
        String(port),
        '--strictPort',
    ], {
        cwd: appRoot,
        stdio: 'ignore',
    });
    const url = `http://localhost:${port}`;
    const deadline = Date.now() + 30_000;

    while (Date.now() < deadline) {
        try {
            if ((await fetch(url)).ok) {
                return {url, stop: () => server.kill()};
            }
        } catch {
            // not up yet
        }

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    server.kill();
    throw new Error('preview server did not start');
};

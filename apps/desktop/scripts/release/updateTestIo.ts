import {execFileSync, spawnSync} from 'node:child_process';
import {
    existsSync,
    mkdtempSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';

import {newestFile, PROCESS_NAME} from './updateTestLib';

export const root = fileURLToPath(new URL('../../../../', import.meta.url));
export const desktop = join(root, 'apps/desktop');
export const workDir = join(desktop, 'update-test-out');
export const backupsDir = join(homedir(), 'Library/Application Support/com.stagistic.editor/backups');
export const lines = createInterface({input: process.stdin});

const iterator = lines[Symbol.asyncIterator]();

export const ask = async (question: string): Promise<string> => {
    process.stdout.write(question);

    const next = await iterator.next();

    return next.done ? 'q' : next.value;
};

export const askHidden = async (question: string): Promise<string> => {
    process.stdout.write(question);

    const stdin = process.stdin;

    // Hidden input: raw mode reads characters without echoing them.
    if (!stdin.isTTY) {
        return ask('');
    }

    stdin.setRawMode(true);

    return new Promise(resolve => {
        let value = '';
        const onData = (chunk: Buffer): void => {
            for (const char of chunk.toString('utf8')) {
                if (char === '\r' || char === '\n') {
                    stdin.setRawMode(false);
                    stdin.off('data', onData);
                    process.stdout.write('\n');
                    // A paste can arrive wrapped in bracketed-paste markers.
                    resolve(value.replaceAll('\u001B[200~', '').replaceAll('\u001B[201~', ''));

                    return;
                }

                if (char === '\u0003') {
                    process.exit(130);
                }

                value = char === '\u007F' ? value.slice(0, -1) : value + char;
            }
        };

        stdin.on('data', onData);
    });
};

export const confirm = async (question: string): Promise<boolean> => {
    for (;;) {
        const answer = (await ask(`${question} [y/n] `)).trim().toLowerCase();

        if (answer === 'y' || answer === 'n') {
            return answer === 'y';
        }
    }
};

export const pause = async (message: string): Promise<void> => {
    await ask(`${message} Press Enter when done. `);
};

export const exec = (command: string, args: string[]): {status: number, output: string} => {
    const result = spawnSync(command, args, {encoding: 'utf8'});

    return {
        status: result.status ?? 1,
        output: `${result.stdout}${result.stderr}`.trim(),
    };
};

export const appVersion = (app: string): string => {
    const plist = join(app, 'Contents/Info.plist');

    return existsSync(plist) ? exec('plutil', [
        '-extract',
        'CFBundleShortVersionString',
        'raw',
        '-o',
        '-',
        plist,
    ]).output : '';
};

export const isRunning = (): boolean => spawnSync('pgrep', ['-x', PROCESS_NAME]).status === 0;

export const waitForQuit = async (): Promise<void> => {
    while (isRunning()) {
        await pause(`${PROCESS_NAME} is running. Quit it (⌘Q); the wizard never kills it.`);
    }
};

export const sleep = async (ms: number): Promise<void> => new Promise(resolve => {
    setTimeout(resolve, ms);
});

export const newestBackup = (): {name: string, mtimeMs: number} | undefined => existsSync(backupsDir) ? newestFile(readdirSync(backupsDir).map(name => ({
    name,
    mtimeMs: statSync(join(backupsDir, name)).mtimeMs,
}))) : undefined;

// Signs a throwaway file so a wrong password fails here, not minutes into Build A.
export const checkUpdaterKeyPassword = (env: NodeJS.ProcessEnv): string | undefined => {
    const dir = mkdtempSync(join(tmpdir(), 'stagistic-key-check-'));
    const file = join(dir, 'check.txt');
    const keyPath = env.TAURI_SIGNING_PRIVATE_KEY_PATH;

    try {
        writeFileSync(file, 'check');
        execFileSync('pnpm', [
            'exec',
            'tauri',
            'signer',
            'sign',
            ...keyPath ? ['--private-key-path', keyPath] : [],
            file,
        ], {
            cwd: desktop,
            env,
            stdio: 'pipe',
        });

        return undefined;
    } catch (error) {
        const output = String((error as {stderr?: Buffer}).stderr ?? '');

        return (/password/i).test(output)
            ? 'Wrong updater key password. Run the wizard again and retype it.'
            : `Updater key check failed: ${output.trim().split('\n').at(-1) ?? 'unknown error'}`;
    } finally {
        rmSync(dir, {force: true, recursive: true});
    }
};

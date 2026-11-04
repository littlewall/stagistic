import {spawn} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import path from 'node:path';
import {StringDecoder} from 'node:string_decoder';

import {superviseTree} from './tree.mjs';

/** Own a private CLI process group; every exit kills remaining descendants before releasing the caller. */
export const executeOpenCode = ({
    args,
    prompt,
    cwd,
    env,
    seconds,
    logDir,
    reader,
    onSession,
    onStart,
}) => new Promise(resolve => {
    const child = spawn('opencode', args, {
        cwd,
        env: {...process.env, ...env},
        detached: true,
        stdio: 'pipe',
    });
    const decoder = new StringDecoder('utf8');
    let stopped = null;
    let spawnError = null;
    let stderr = '';
    let savedSession = reader.state.sessionId;
    const tree = superviseTree(child);
    let forceTimer;
    const stop = reason => {
        if (stopped) return;

        stopped = reason;
        tree.interrupt();
        forceTimer = setTimeout(tree.kill, 250);
    };
    const interrupt = signal => stop(`cancelled (${signal})`);
    const sigint = () => interrupt('SIGINT');
    const sigterm = () => interrupt('SIGTERM');
    const sighup = () => interrupt('SIGHUP');

    process.on('SIGINT', sigint);
    process.on('SIGTERM', sigterm);
    process.on('SIGHUP', sighup);
    process.on('exit', tree.kill);

    const timer = setTimeout(() => stop(`timed out after ${seconds}s`), seconds * 1000);

    child.on('spawn', () => {
        onStart(child.pid);
        tree.capture();
    });
    child.on('exit', () => {
        if (!stopped) tree.kill();
    });
    child.stdout.on('data', chunk => {
        appendFileSync(path.join(logDir, 'stdout.jsonl'), chunk);
        reader.feed(decoder.write(chunk));

        if (reader.state.sessionId && reader.state.sessionId !== savedSession) {
            savedSession = reader.state.sessionId;
            onSession(savedSession);
        }

        if (reader.state.error) stop(reader.state.error);
    });
    child.stderr.on('data', chunk => {
        appendFileSync(path.join(logDir, 'stderr.log'), chunk);
        stderr = `${stderr}${chunk}`.slice(-8192);
    });
    child.on('error', error => {
        spawnError = error;
    });
    child.on('close', async code => {
        clearTimeout(timer);
        clearTimeout(forceTimer);
        process.off('SIGINT', sigint);
        process.off('SIGTERM', sigterm);
        process.off('SIGHUP', sighup);

        const cleanup = await tree.finish();

        process.off('exit', tree.kill);
        reader.feed(decoder.end());
        resolve({
            code,
            spawnError,
            stopped,
            stderr,
            ...cleanup,
            ...reader.finish(),
        });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
});

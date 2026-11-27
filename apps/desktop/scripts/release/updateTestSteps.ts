import {execFileSync} from 'node:child_process';
import {
    createReadStream,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    statSync,
} from 'node:fs';
import {createServer, type Server} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
    ASSET_NAMES,
    selectSigning,
    UPDATER_PUBKEY_PLACEHOLDER,
} from './lib';
import {
    appVersion,
    askHidden,
    backupsDir,
    checkUpdaterKeyPassword,
    confirm,
    desktop,
    exec,
    newestBackup,
    pause,
    sleep,
    waitForQuit,
    workDir,
} from './updateTestIo';
import {
    buildArgs,
    INSTALLED_APP,
    isTestBuild,
    servedFile,
    type StepId,
    testVersions,
    UPDATE_TEST_PORT,
    UPDATE_TIMEOUT_MS,
} from './updateTestLib';

export interface State {
    base: string,
    env: Record<string, string | undefined>,
    server?: Server,
    archiveServed: boolean,
    updateStartedAt: number,
    answers: {question: string, answer: string}[],
}

export type Outcome = {status: 'PASS' | 'FAIL', notes: string[]};

const done = (notes: string[] = []): Outcome => ({
    status: 'PASS',
    notes,
});
const failed = (note: string): Outcome => ({
    status: 'FAIL',
    notes: [note],
});

const buildStep = (state: State, version: string, dir: string): Outcome => {
    console.log(`Running: tsx ${buildArgs(version, `update-test-out/${dir}`).join(' ')}`);
    execFileSync('pnpm', [
        'exec',
        'tsx',
        ...buildArgs(version, `update-test-out/${dir}`),
    ], {
        cwd: desktop,
        env: state.env,
        stdio: 'inherit',
    });

    const out = join(workDir, dir);

    if (!existsSync(join(out, ASSET_NAMES.dmg))) {
        return failed(`No DMG in ${out}.`);
    }

    if (dir === 'B' && !existsSync(join(out, ASSET_NAMES.latest))) {
        return failed(`Build B has no ${ASSET_NAMES.latest}; the signing key or updater config is missing.`);
    }

    return done([out]);
};

export const stopServer = async (state: State): Promise<void> => {
    const server = state.server;

    state.server = undefined;

    if (server !== undefined) {
        server.closeAllConnections();
        await new Promise<void>(resolve => {
            server.close(() => {
                resolve();
            });
        });
        console.log('Update server stopped.');
    }
};

const startServer = async (state: State): Promise<void> => {
    if (state.server !== undefined) {
        return;
    }

    const dir = join(workDir, 'B');

    state.server = createServer((request, response) => {
        const name = servedFile(request.url ?? '/');

        console.log(`[server] ${request.method} ${request.url} -> ${name === undefined || !existsSync(join(dir, name)) ? 404 : 200}`);

        if (name === undefined || !existsSync(join(dir, name))) {
            response.writeHead(404).end();

            return;
        }

        if (name === ASSET_NAMES.updaterArchive) {
            state.archiveServed = true;
        }

        response.writeHead(200, {'content-length': statSync(join(dir, name)).size});
        createReadStream(join(dir, name)).pipe(response);
    });
    await new Promise<void>(resolve => {
        state.server?.listen(UPDATE_TEST_PORT, '127.0.0.1', resolve);
    });
    console.log(`Serving ${dir} on http://127.0.0.1:${UPDATE_TEST_PORT}/ (latest.json and the archive only).`);
};

const stepPreflight = async (state: State): Promise<Outcome> => {
    const config = JSON.parse(readFileSync(join(desktop, 'src-tauri/tauri.conf.json'), 'utf8')) as {plugins?: {updater?: {pubkey?: string}}};
    const pubkey = config.plugins?.updater?.pubkey;

    if (pubkey === undefined || pubkey === UPDATER_PUBKEY_PLACEHOLDER) {
        return failed('tauri.conf.json still has the placeholder updater public key (docs/releasing/credentials.md).');
    }

    if (!state.env.TAURI_SIGNING_PRIVATE_KEY_PATH && !state.env.TAURI_SIGNING_PRIVATE_KEY) {
        return failed('No updater signing key. Run: source ~/.config/stagistic/release.env');
    }

    if (!state.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
        state.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = await askHidden('TAURI_SIGNING_PRIVATE_KEY_PASSWORD (hidden, empty if none): ');
    }

    const passwordProblem = checkUpdaterKeyPassword(state.env);

    if (passwordProblem !== undefined) {
        delete state.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;

        return failed(passwordProblem);
    }

    const signing = selectSigning(state.env);

    console.log(`Signing mode: ${signing.mode === 'developer-id' ? `Developer ID (${signing.identity})` : 'ad-hoc'}.`);
    console.log(`WARNING: this test uses the real app data of com.stagistic.editor on this Mac.
The app backs up on quit; Settings > Storage lists backups (${backupsDir}).`);

    return done([`signing ${signing.mode}`, `base ${state.base}`]);
};

const stepBuildA = (state: State): Promise<Outcome> => {
    const versions = testVersions(state.base);

    return Promise.resolve(buildStep(state, versions.a, 'A'));
};

const stepBuildB = (state: State): Promise<Outcome> => {
    const versions = testVersions(state.base);

    return Promise.resolve(buildStep(state, versions.b, 'B'));
};

const stepInstallA = async (state: State): Promise<Outcome> => {
    const versions = testVersions(state.base);

    const dmg = join(workDir, 'A', ASSET_NAMES.dmg);

    if (!existsSync(dmg)) {
        return failed(`Missing ${dmg}; run build-a first.`);
    }

    await waitForQuit();

    const notes: string[] = [];

    if (existsSync(INSTALLED_APP) && !isTestBuild(appVersion(INSTALLED_APP))) {
        const previous = join(workDir, 'previous');

        mkdirSync(previous, {recursive: true});
        rmSync(join(previous, 'Stagistic Editor.app'), {
            recursive: true,
            force: true,
        });
        renameSync(INSTALLED_APP, join(previous, 'Stagistic Editor.app'));
        console.log(`Moved the installed app to ${previous}.`);
        notes.push('previous app moved');
    } else {
        rmSync(INSTALLED_APP, {
            recursive: true,
            force: true,
        });
    }

    const mount = mkdtempSync(join(tmpdir(), 'stagistic-update-'));
    const attach = exec('hdiutil', [
        'attach',
        '-nobrowse',
        '-readonly',
        '-mountpoint',
        mount,
        dmg,
    ]);

    if (attach.status !== 0) {
        return failed(attach.output);
    }

    try {
        const app = readdirSync(mount).find(name => name.endsWith('.app'));

        if (app === undefined) {
            return failed('No .app in the DMG.');
        }

        execFileSync('ditto', [join(mount, app), INSTALLED_APP], {stdio: 'inherit'});
    } finally {
        exec('hdiutil', [
            'detach',
            mount,
            '-force',
        ]);
        rmSync(mount, {
            recursive: true,
            force: true,
        });
    }

    const installed = appVersion(INSTALLED_APP);

    return installed === versions.a ? done([...notes, `installed ${installed}`]) : failed(`Installed version is ${installed || '(none)'}, expected ${versions.a}.`);
};

const stepUseA = async (state: State): Promise<Outcome> => {
    const versions = testVersions(state.base);

    console.log(`Open A (${versions.a}), create a script, attach a score PDF, edit it, then quit with ⌘Q so a backup is written.`);
    await pause('');

    const backup = newestBackup();

    if (backup === undefined) {
        console.log(`No backup found in ${backupsDir}.`);

        return failed('no backup after quitting A');
    }

    const text = `${backup.name} at ${new Date(backup.mtimeMs).toLocaleString()}`;

    console.log(`Newest backup: ${text}`);

    return done([text]);
};

const stepServeB = async (state: State): Promise<Outcome> => {
    if (!existsSync(join(workDir, 'B', ASSET_NAMES.latest))) {
        return failed('Build B has no latest.json; run build-b first.');
    }

    await startServer(state);

    return done([`port ${UPDATE_TEST_PORT}`]);
};

const stepUpdate = async (state: State): Promise<Outcome> => {
    const versions = testVersions(state.base);

    await startServer(state);
    state.archiveServed = false;
    state.updateStartedAt = Date.now();
    console.log(`Open A. Wait for the check or choose "Check for Updates…".
The footer shows "Release ${versions.b} is ready. Restart" and Settings > About app shows the same. Choose Restart.`);

    const deadline = Date.now() + UPDATE_TIMEOUT_MS;
    let lastReport = 0;

    while (Date.now() < deadline) {
        if (state.archiveServed && appVersion(INSTALLED_APP) === versions.b) {
            return done([`installed ${versions.b}`]);
        }

        if (Date.now() - lastReport > 15_000) {
            lastReport = Date.now();
            console.log(`Waiting... archive served: ${state.archiveServed ? 'yes' : 'no'}, installed: ${appVersion(INSTALLED_APP) || '(none)'}, ${Math.round((deadline - Date.now()) / 1000)} s left.`);
        }

        await sleep(2000);
    }

    return failed(`Timed out after 10 minutes (archive served: ${state.archiveServed}, installed ${appVersion(INSTALLED_APP)}).`);
};

const stepVerify = async (state: State): Promise<Outcome> => {
    const versions = testVersions(state.base);

    const notes: string[] = [];
    let ok = true;
    const record = (pass: boolean, text: string): void => {
        console.log(`${pass ? 'PASS' : 'FAIL'}  ${text}`);
        notes.push(`${pass ? 'PASS' : 'FAIL'} ${text}`);
        ok &&= pass;
    };
    const version = appVersion(INSTALLED_APP);

    record(version === versions.b, `installed version ${version || '(none)'} (want ${versions.b})`);
    record(exec('codesign', [
        '--verify',
        '--deep',
        '--strict',
        INSTALLED_APP,
    ]).status === 0, 'codesign verify');

    const backup = newestBackup();

    record(backup !== undefined && backup.mtimeMs > state.updateStartedAt, `backup newer than the update start (${backup?.name ?? 'none'})`);

    const intact = await confirm('Are your scripts, the attachment and the backups list intact?');

    state.answers.push({
        question: 'Scripts, attachment and backups intact after update',
        answer: intact ? 'y' : 'n',
    });
    record(intact, 'user confirmed data intact');

    return {
        status: ok ? 'PASS' : 'FAIL',
        notes,
    };
};

const stepCleanup = async (state: State): Promise<Outcome> => {
    await stopServer(state);
    console.log(`The test build stays installed. To restore the previous app: quit Stagistic Editor, then move ${join(workDir, 'previous', 'Stagistic Editor.app')} to /Applications (replace the test build).`);

    return done();
};

export const stepHandlers: Record<StepId, (state: State) => Promise<Outcome>> = {
    preflight: stepPreflight,
    'build-a': stepBuildA,
    'build-b': stepBuildB,
    'install-a': stepInstallA,
    'use-a': stepUseA,
    'serve-b': stepServeB,
    update: stepUpdate,
    verify: stepVerify,
    cleanup: stepCleanup,
};

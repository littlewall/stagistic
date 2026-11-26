import {execFileSync, spawnSync} from 'node:child_process';
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parseRelease, renderGithubRelease} from '@stagistic/release-notes';
import {readReleaseNumbers} from '@stagistic/release-notes/node';

import {
    assertUpdaterReady,
    ASSET_NAMES,
    buildConfigOverride,
    draftTag,
    effectiveVersion,
    ghCommands,
    hasUpdaterSigningKey,
    latestJson,
    mcpBuildArgs,
    parseArgs,
    plainNotes,
    resolveReleaseNumber,
    selectSigning,
    signingEnv,
    TARGET_TRIPLE,
    tauriBuildArgs,
    UPDATER_PUBKEY_PLACEHOLDER,
} from './lib';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const desktop = join(root, 'apps/desktop');
const bundleDir = join(desktop, 'src-tauri/target', TARGET_TRIPLE, 'release/bundle');

const run = (command: string, args: string[], cwd: string, env: Record<string, string | undefined>): void => {
    execFileSync(command, args, {
        cwd,
        env,
        stdio: 'inherit',
    });
};

const findOne = (dir: string, suffix: string): string => {
    const found = existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith(suffix)) : [];

    if (found.length !== 1) {
        throw new Error(`Expected one *${suffix} in ${dir}, found ${found.length}.`);
    }

    return join(dir, found[0]);
};

const main = (): void => {
    const args = parseArgs(process.argv.slice(2));
    const release = resolveReleaseNumber(readReleaseNumbers(root), args.tag);
    const version = effectiveVersion(release, args.testVersion);
    const outDir = args.outDir ?? join(desktop, 'release-out');
    const signing = selectSigning(process.env);
    const env = signingEnv(process.env, signing);
    const tauriConfig = JSON.parse(readFileSync(join(desktop, 'src-tauri/tauri.conf.json'), 'utf8')) as {
        plugins?: {updater?: {pubkey?: string}},
        bundle?: {createUpdaterArtifacts?: unknown},
    };
    const hasUpdaterConfig = tauriConfig.plugins?.updater !== undefined;
    const canSignUpdates = hasUpdaterSigningKey(process.env);

    assertUpdaterReady({
        args,
        hasUpdaterConfig,
        canSignUpdates,
        pubkey: tauriConfig.plugins?.updater?.pubkey,
    });

    if (hasUpdaterConfig && canSignUpdates && tauriConfig.plugins?.updater?.pubkey === UPDATER_PUBKEY_PLACEHOLDER) {
        throw new Error('plugins.updater.pubkey in tauri.conf.json is still the placeholder; paste the public key (docs/releasing/credentials.md).');
    }

    if (hasUpdaterConfig && !canSignUpdates) {
        console.log('TAURI_SIGNING_PRIVATE_KEY not set: building without updater artifacts (no .app.tar.gz, .sig, latest.json).');
    }

    const notesFile = join(root, 'releases', `${release}.md`);

    if (!existsSync(notesFile)) {
        throw new Error(`Missing ${notesFile}; run root:release-prepare first.`);
    }

    const notes = parseRelease(readFileSync(notesFile, 'utf8'), notesFile);

    console.log(`Release ${release}, building ${version}, signing: ${signing.mode}.`);
    run('pnpm', [
        'exec',
        'node',
        ...mcpBuildArgs(signing),
    ], join(root, 'packages/mcp'), env);

    if (args.tag !== undefined) {
        // The signed bridge and its .mcpb must agree before they are bundled into the app.
        run('pnpm', [
            'exec',
            'node',
            'scripts/verify-artifacts.mjs',
        ], join(root, 'packages/mcp'), env);
    }

    rmSync(bundleDir, {recursive: true, force: true});
    run('pnpm', [
        'exec',
        'tauri',
        ...tauriBuildArgs(buildConfigOverride({
            testVersion: args.testVersion,
            updaterEndpoint: args.updaterEndpoint,
            hasUpdaterConfig,
            hasUpdaterSigningKey: canSignUpdates,
        })),
    ], desktop, env);

    rmSync(outDir, {recursive: true, force: true});
    mkdirSync(outDir, {recursive: true});

    const files: string[] = [];
    const place = (source: string, name: string): string => {
        const target = join(outDir, name);

        copyFileSync(source, target);
        files.push(target);

        return target;
    };

    place(findOne(join(bundleDir, 'dmg'), '.dmg'), ASSET_NAMES.dmg);

    const archive = join(bundleDir, 'macos');
    const hasUpdaterArtifacts = existsSync(archive) && readdirSync(archive).some(name => name.endsWith('.app.tar.gz.sig'));

    if (hasUpdaterArtifacts) {
        place(findOne(archive, '.app.tar.gz'), ASSET_NAMES.updaterArchive);

        const signaturePath = place(findOne(archive, '.app.tar.gz.sig'), ASSET_NAMES.updaterSignature);
        const latest = latestJson({
            version,
            notes: plainNotes(notes),
            pubDate: new Date().toISOString(),
            signature: readFileSync(signaturePath, 'utf8').trim(),
        });

        writeFileSync(join(outDir, ASSET_NAMES.latest), `${JSON.stringify(latest, null, 2)}\n`);
        files.push(join(outDir, ASSET_NAMES.latest));
    } else {
        console.log('No updater artifacts (createUpdaterArtifacts/signing key not configured); skipping .app.tar.gz, .sig and latest.json.');
    }

    const bodyFile = join(outDir, 'release-body.md');

    writeFileSync(bodyFile, renderGithubRelease(notes));
    console.log(`Assets in ${outDir}:\n${[...files, bodyFile].map(file => `  ${file}`).join('\n')}`);

    if (!args.publishDraft) {
        console.log('Dry run: no GitHub Release touched (pass --publish-draft to create or update the draft).');

        return;
    }

    const exists = spawnSync('gh', [
        'release',
        'view',
        draftTag(version),
        '--repo',
        'littlewall/stagistic',
    ], {stdio: 'ignore'}).status === 0;

    for (const command of ghCommands({
        version,
        exists,
        bodyFile,
        files,
    })) {
        run('gh', command, root, process.env);
    }
};

main();

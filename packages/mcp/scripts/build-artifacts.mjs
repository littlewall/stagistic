import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
    chmod,
    copyFile,
    mkdir,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {collectLicenses} from './licenses.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const development = process.argv.includes('--development');
const release = process.argv.includes('--release');
const identity = release ? process.env.STAGISTIC_MCP_SIGNING_IDENTITY : '-';

if (process.platform !== 'darwin') {
    throw new Error('Native MCP distribution requires macOS and Xcode command line tools.');
}

if (!identity || (release && identity === '-')) {
    throw new Error('Release builds require STAGISTIC_MCP_SIGNING_IDENTITY.');
}

const run = (command, args) => execFileSync(command, args, {cwd: root, stdio: 'inherit'});
const output = path.join(root, development ? 'dist-dev' : 'dist');
const stage = path.join(output, 'stage');
const executable = path.join(output, 'stagistic-mcp');

await mkdir(output, {recursive: true});
await rm(stage, {recursive: true, force: true});
await mkdir(path.join(stage, 'server'), {recursive: true});

if (development) {
    run('cargo', [
        'build',
        '--locked',
        '-p',
        'stagistic-mcp',
    ]);
    await copyFile(path.join(root, 'target/debug/stagistic-mcp'), executable);
} else {
    for (const target of ['aarch64-apple-darwin', 'x86_64-apple-darwin']) {
        run('cargo', [
            'build',
            '--release',
            '--locked',
            '-p',
            'stagistic-mcp',
            '--target',
            target,
        ]);
    }

    run('/usr/bin/lipo', [
        '-create',
        'target/aarch64-apple-darwin/release/stagistic-mcp',
        'target/x86_64-apple-darwin/release/stagistic-mcp',
        '-output',
        executable,
    ]);
}

run('/usr/bin/codesign', [
    '--force',
    '--sign',
    identity,
    ...release ? [
        '--options',
        'runtime',
        '--timestamp',
    ] : [],
    executable,
]);
await chmod(executable, 0o755);
await copyFile(executable, path.join(stage, 'server/stagistic-mcp'));
await copyFile(path.join(root, 'icon.png'), path.join(stage, 'icon.png'));

const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const tools = JSON.parse(await readFile(path.join(root, 'src/generated/tools.json'), 'utf8'));

manifest.tools = tools.map(({name, description}) => ({name, description}));

const version = execFileSync(executable, ['--version'], {encoding: 'utf8'}).trim().split(' ')[1];

if (version !== manifest.version) {
    throw new Error('MCP executable and manifest versions disagree.');
}

await writeFile(path.join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await copyFile(path.resolve(root, '../../LICENSE'), path.join(stage, 'LICENSE.txt'));
await writeFile(path.join(stage, 'THIRD_PARTY_NOTICES.txt'), await collectLicenses(root));
run('mcpb', ['validate', path.join(stage, 'manifest.json')]);
run('mcpb', [
    'pack',
    stage,
    path.join(output, 'stagistic.mcpb'),
]);

const sha256 = createHash('sha256').update(await readFile(executable)).digest('hex');

await writeFile(path.join(output, 'artifacts.json'), `${JSON.stringify({
    version,
    protocol_version: 1,
    sha256,
    development,
    signing: release ? 'developer-id' : 'ad-hoc',
}, null, 2)}\n`);
await rm(stage, {recursive: true, force: true});

const resources = path.join(root, 'tauri-resources');

await mkdir(resources, {recursive: true});
await copyFile(executable, path.join(resources, 'stagistic-mcp'));
await copyFile(path.join(output, 'stagistic.mcpb'), path.join(resources, 'stagistic.mcpb'));

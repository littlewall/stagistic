import {execFileSync} from 'node:child_process';
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const icons = path.join(root, 'src-tauri/icons');
const document = path.join(icons, 'Stagistic.icon');
const source = await readFile(path.resolve(root, '../web/public/favicon.svg'), 'utf8');
const viewBox = source.match(/viewBox="([^"]+)"/u)?.[1].split(' ').map(Number);
const shapes = Array.from(source.matchAll(/<path[^>]*\sd="([^"]+)"/gu), match => match[1]);

if (process.platform !== 'darwin') {
    throw new Error('Icon generation requires macOS and full Xcode with Icon Composer.');
}

if (!viewBox || viewBox.length !== 4 || shapes.length !== 2) {
    throw new Error('The Stagistic favicon geometry changed; review the app icon composition.');
}

const [
    x,
    y,
    width,
    height,
] = viewBox;
const scale = (1024 * 0.68) / Math.max(width, height);
const paths = shapes.map(shape => `<path d="${shape}"/>`).join('\n');
const transform = `translate(512 512) scale(${scale}) translate(${-x - width / 2} ${-y - height / 2})`;
const mcpScale = (1024 * 0.8) / Math.max(width, height);
const mcpTransform = `translate(512 512) scale(${mcpScale}) translate(${-x - width / 2} ${-y - height / 2})`;
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<g fill="#3d2a1d" transform="${transform}">
${paths}
</g></svg>\n`;

await mkdir(path.join(document, 'Assets'), {recursive: true});
await writeFile(path.join(document, 'Assets/Mark.svg'), mark);

const temporary = await mkdtemp(path.join(tmpdir(), 'stagistic-icons-'));
const run = (command, args) => execFileSync(command, args, {cwd: root, stdio: 'inherit'});
const actool = execFileSync('xcrun', ['--find', 'actool'], {encoding: 'utf8'}).trim();
const ictool = path.resolve(path.dirname(actool), '../../../Applications/Icon Composer.app/Contents/Executables/ictool');

try {
    run('xcrun', [
        'actool',
        document,
        '--compile',
        temporary,
        '--platform',
        'macosx',
        '--minimum-deployment-target',
        '10.13',
        '--app-icon',
        'Stagistic',
        '--include-all-app-icons',
        '--output-partial-info-plist',
        path.join(temporary, 'partial.plist'),
    ]);
    await copyFile(path.join(temporary, 'Assets.car'), path.join(icons, 'Assets.car'));

    await copyFile(path.join(temporary, 'Stagistic.icns'), path.join(icons, 'icon.icns'));
    run(ictool, [
        document,
        '--export-image',
        '--output-file',
        path.join(icons, 'icon.png'),
        '--platform',
        'macOS',
        '--rendition',
        'Default',
        '--width',
        '1024',
        '--height',
        '1024',
        '--scale',
        '1',
    ]);

    for (const [size, name] of [
        [32, '32x32'],
        [64, '64x64'],
        [128, '128x128'],
        [256, '128x128@2x'],
        [512, '512x512'],
    ]) {
        run('/usr/bin/sips', [
            '-z',
            String(size),
            String(size),
            path.join(icons, 'icon.png'),
            '--out',
            path.join(icons, `${name}.png`),
        ]);
    }

    const flatSource = path.join(temporary, 'mcp.svg');
    const flatOutput = path.join(temporary, 'mcp');

    await writeFile(flatSource, `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<rect width="1024" height="1024" fill="#fff"/>
<g fill="#3d2a1d" transform="${mcpTransform}">${paths}</g>
</svg>\n`);
    run('pnpm', [
        'exec',
        'tauri',
        'icon',
        flatSource,
        '--png',
        '512',
        '--output',
        flatOutput,
    ]);
    await copyFile(path.join(flatOutput, '512x512.png'), path.resolve(root, '../../packages/mcp/icon.png'));
} finally {
    await rm(temporary, {recursive: true, force: true});
}

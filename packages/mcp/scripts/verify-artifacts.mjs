import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const output = new URL(process.argv.includes('--development') ? '../dist-dev/' : '../dist/', import.meta.url);
const executable = new URL('stagistic-mcp', output);
const archive = new URL('stagistic.mcpb', output);
const metadata = JSON.parse(await readFile(new URL('artifacts.json', output), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const packed = execFileSync('/usr/bin/unzip', [
    '-p',
    fileURLToPath(archive),
    'server/stagistic-mcp',
], {maxBuffer: 64 * 1024 * 1024});

if (hash(packed) !== hash(await readFile(executable)) || hash(packed) !== metadata.sha256) {
    throw new Error('MCPB and manual executable bytes differ.');
}

const manifest = JSON.parse(execFileSync('/usr/bin/unzip', [
    '-p',
    fileURLToPath(archive),
    'manifest.json',
], {encoding: 'utf8'}));

if (manifest.server.type !== 'binary' || manifest.server.mcp_config.command !== '${__dirname}/server/stagistic-mcp') {
    throw new Error('MCPB does not launch the native bridge directly.');
}

if (((await stat(executable)).mode & 0o111) === 0) {
    throw new Error('MCP executable has lost executable permissions.');
}

execFileSync('/usr/bin/codesign', [
    '--verify',
    '--strict',
    fileURLToPath(executable),
], {stdio: 'pipe'});

const architectures = execFileSync('/usr/bin/lipo', ['-archs', fileURLToPath(executable)], {encoding: 'utf8'}).trim();

if (!metadata.development && (!architectures.includes('arm64') || !architectures.includes('x86_64'))) {
    throw new Error('MCP executable is not universal.');
}

const libraries = execFileSync('/usr/bin/otool', ['-L', fileURLToPath(executable)], {encoding: 'utf8'}).split('\n').filter(line => (/^\s+\S+\s+\(compatibility version/u).test(line));

if (libraries.some(line => !(/^\s+\/(?:usr\/lib|System\/Library)\//u).test(line))) {
    throw new Error('MCP executable requires non-system dynamic libraries.');
}

console.log(`Verified identical ${architectures} MCP artifacts (${metadata.signing}, version ${metadata.version}).`);

// Writes the third-party licence file bundled with the Mac app.
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {collectLicenses} from '../../../packages/mcp/scripts/licenses.mjs';
import {collectNpmLicenses} from './npmLicenses.mjs';

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(desktopDir, 'src-tauri/licenses/THIRD_PARTY_LICENSES.txt');
const SEPARATOR = '\n\n====================\n\n';

const rust = await collectLicenses(path.join(desktopDir, 'src-tauri'), {
    packageName: 'stagistic-editor',
    onMissing: pkg => `No license file is shipped in this crate. Declared license: ${pkg.license}.${pkg.repository ? ` Source: ${pkg.repository}` : ''}`,
});
const npm = await collectNpmLicenses(desktopDir);

await mkdir(path.dirname(output), {recursive: true});
await writeFile(output, [
    'Stagistic Editor includes the third-party software listed below.',
    `RUST CRATES\n\n${rust.trim()}`,
    `NPM PACKAGES\n\n${npm.join(SEPARATOR)}`,
].join(SEPARATOR) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), output)}`);

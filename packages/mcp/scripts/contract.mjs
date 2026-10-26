import {execFileSync} from 'node:child_process';
import {
    mkdir,
    readFile,
    writeFile,
} from 'node:fs/promises';

import {compile} from 'json-schema-to-typescript';

const schemas = JSON.parse(execFileSync('cargo', [
    'run',
    '--locked',
    '-q',
    '-p',
    'stagistic-mcp-protocol',
    '--bin',
    'export_contract',
], {encoding: 'utf8'}));
const output = new URL('../src/generated/', import.meta.url);

await mkdir(output, {recursive: true});
for (const [name, schema] of Object.entries(schemas)) {
    const files = {[`${name}.json`]: `${JSON.stringify(schema, null, 2)}\n`};

    if (name !== 'tools') {
        files[`${name}.ts`] = await compile(schema, name, {$refOptions: {resolve: {external: false}}});
    }

    for (const [file, content] of Object.entries(files)) {
        const target = new URL(file, output);

        if (process.argv.includes('--check')) {
            if (await readFile(target, 'utf8') !== content) {
                throw new Error(`Stale generated MCP contract: ${file}`);
            }
        } else {
            await writeFile(target, content);
        }
    }
}

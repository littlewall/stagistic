import {execFileSync} from 'node:child_process';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

export const collectLicenses = async root => {
    const metadata = JSON.parse(execFileSync('cargo', [
        'metadata',
        '--locked',
        '--format-version',
        '1',
        '--filter-platform',
        'aarch64-apple-darwin',
    ], {cwd: root, encoding: 'utf8'}));
    const packages = new Map(metadata.packages.map(pkg => [pkg.id, pkg]));
    const nodes = new Map(metadata.resolve.nodes.map(node => [node.id, node]));
    const server = metadata.packages.find(pkg => pkg.name === 'stagistic-mcp');
    const visited = new Set();
    const visit = id => {
        if (visited.has(id)) {
            return;
        }

        visited.add(id);

        for (const dep of nodes.get(id).deps) {
            if (dep.dep_kinds.some(kind => kind.kind !== 'dev')) {
                visit(dep.pkg);
            }
        }
    };

    visit(server.id);

    const apacheSource = metadata.packages.find(pkg => pkg.name === 'serde');
    const apache = await readFile(path.join(path.dirname(apacheSource.manifest_path), 'LICENSE-APACHE'), 'utf8');
    const notices = [];

    for (const id of Array.from(visited).toSorted((left, right) => left.localeCompare(right))) {
        const pkg = packages.get(id);

        if (!pkg.source) {
            continue;
        }

        const directory = path.dirname(pkg.manifest_path);
        const files = (await readdir(directory)).filter(file => (/^(?:LICENSE|COPYING|NOTICE)/iu).test(file));
        const texts = await Promise.all(files.toSorted().map(file => readFile(path.join(directory, file), 'utf8')));

        if (texts.length === 0 && pkg.license === 'Apache-2.0') {
            texts.push(apache);
        }

        if (texts.length === 0) {
            throw new Error(`Missing license text for ${pkg.name}.`);
        }

        notices.push(`${pkg.name} ${pkg.version} (${pkg.license})\n${texts.join('\n')}`);
    }

    return `${notices.join('\n\n====================\n\n')}\n`;
};

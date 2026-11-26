import {existsSync} from 'node:fs';
import {
    readdir,
    readFile,
    realpath,
} from 'node:fs/promises';
import path from 'node:path';

const LICENSE_FILE = /^(?:LICENSE|LICENCE|COPYING|NOTICE)/iu;

const readJson = async file => JSON.parse(await readFile(file, 'utf8'));

// Node resolution: the nearest node_modules/<name> walking up from `from`.
const findPackageDir = (name, from) => {
    for (let dir = from; ; dir = path.dirname(dir)) {
        const candidate = path.join(dir, 'node_modules', name);

        if (existsSync(path.join(candidate, 'package.json'))) {
            return candidate;
        }

        if (path.dirname(dir) === dir) {
            return null;
        }
    }
};

const licenseText = async (directory, pkg) => {
    const files = (await readdir(directory)).filter(file => LICENSE_FILE.test(file)).toSorted();
    const texts = await Promise.all(files.map(file => readFile(path.join(directory, file), 'utf8')));

    if (texts.length > 0) {
        return texts.join('\n');
    }

    const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;

    return `No license file is shipped in this package. Declared license: ${pkg.license ?? 'unknown'}.${repository ? ` Source: ${repository}` : ''}`;
};

/*
 * Notices for the production npm dependencies reachable from a package.
 * Workspace packages (`workspace:` ranges) are ours: they are walked for their
 * own dependencies but not listed.
 */
export const collectNpmLicenses = async packageDir => {
    const found = new Map();
    const visit = async (directory, {listed}) => {
        const real = await realpath(directory);
        const pkg = await readJson(path.join(real, 'package.json'));

        if (listed) {
            const key = `${pkg.name}@${pkg.version}`;

            if (found.has(key)) {
                return;
            }

            found.set(key, `${key} (${pkg.license ?? 'unknown'})\n${await licenseText(real, pkg)}`);
        }

        const dependencies = {...pkg.dependencies, ...pkg.optionalDependencies};

        for (const [name, range] of Object.entries(dependencies)) {
            const dependencyDir = findPackageDir(name, listed ? real : directory);

            if (!dependencyDir) {
                if (pkg.optionalDependencies?.[name]) {
                    continue;
                }

                throw new Error(`Cannot resolve ${name} from ${real}.`);
            }

            await visit(dependencyDir, {listed: !String(range).startsWith('workspace:')});
        }
    };

    await visit(packageDir, {listed: false});

    return Array.from(found.entries())
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([, notice]) => notice);
};

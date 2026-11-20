import {
    existsSync,
    readdirSync,
    readFileSync,
    realpathSync,
} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';

export class FlowError extends Error {
    name = 'FlowError';
}

const sameDir = (a, b) => {
    if (path.resolve(a) === path.resolve(b)) {
        return true;
    }

    return existsSync(a) && existsSync(b) && realpathSync(a) === realpathSync(b);
};

/** Install root of the plugin as Claude Code recorded it: this repository's project install, else a user install. */
export const resolvePluginRoot = ({
    home = homedir(),
    cwd = process.cwd(),
    plugin,
}) => {
    const registry = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
    const installs = existsSync(registry) ? JSON.parse(readFileSync(registry, 'utf8')).plugins?.[plugin] ?? [] : [];
    const install = installs.find(entry => entry.scope !== 'user' && entry.projectPath && sameDir(entry.projectPath, cwd))
        ?? installs.find(entry => entry.scope === 'user');

    if (!install || !existsSync(install.installPath)) {
        throw new FlowError(`plugin ${plugin} is not installed for ${cwd}. Run: claude plugin install ${plugin} --scope project`);
    }

    return {root: install.installPath, version: install.version};
};

/** Directory of a skill inside the plugin, whatever its category folder. */
export const skillDir = (root, name) => {
    const skillsRoot = path.join(root, 'skills');

    if (!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(name)) {
        throw new FlowError(`invalid skill name: ${name}`);
    }

    if (existsSync(path.join(skillsRoot, name, 'SKILL.md'))) {
        return path.join(skillsRoot, name);
    }

    const category = readdirSync(skillsRoot).find(entry => existsSync(path.join(skillsRoot, entry, name, 'SKILL.md')));

    if (!category) {
        throw new FlowError(`skill ${name} not found in ${skillsRoot}`);
    }

    return path.join(skillsRoot, category, name);
};

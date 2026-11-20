import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
    loadConfig,
    resolveRole,
    toolRoot,
    validateConfig,
} from './config.mjs';
import {renderAgent, renderOpenCodeAgent} from './render.mjs';

/** Writes `.claude/agents/<role>.md` for every role; with `check`, only reports drift. */
export const syncAgents = ({
    cwd = process.cwd(),
    check = false,
} = {}) => {
    const config = loadConfig({cwd});
    const errors = validateConfig(config);

    if (errors.length > 0) {
        return {
            written: [],
            drift: [],
            errors,
        };
    }

    const agentsDir = path.join(cwd, '.claude', 'agents');
    const files = Object.keys(config.roles).flatMap(role => {
        const promptFile = path.join(toolRoot, 'prompts', `${role}.md`);
        const resolved = resolveRole(config, role);
        const prompt = readFileSync(promptFile, 'utf8');
        const definitions = [{file: path.join(agentsDir, `${role}.md`), content: renderAgent(resolved, prompt, path.relative(cwd, promptFile))}];

        if (resolved.provider === 'opencode') {
            definitions.push({file: path.join(cwd, '.opencode', 'agents', `roles-${role}.md`), content: renderOpenCodeAgent(resolved, prompt)});
        }

        return definitions.map(({file, content}) => ({
            file,
            content,
            changed: !existsSync(file) || readFileSync(file, 'utf8') !== content,
        }));
    });
    const changed = files.filter(({changed: isChanged}) => isChanged).map(({file}) => file);

    if (check) {
        return {
            written: [],
            drift: changed,
            errors,
        };
    }

    mkdirSync(agentsDir, {recursive: true});

    for (const {
        file,
        content,
        changed: isChanged,
    } of files) {
        if (isChanged) {
            mkdirSync(path.dirname(file), {recursive: true});
            writeFileSync(file, content);
        }
    }

    return {
        written: changed,
        drift: [],
        errors,
    };
};

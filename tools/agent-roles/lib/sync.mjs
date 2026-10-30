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
import {renderAgent} from './render.mjs';

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
    const files = Object.keys(config.roles).map(role => {
        const promptFile = path.join(toolRoot, 'prompts', `${role}.md`);
        const content = renderAgent(resolveRole(config, role), readFileSync(promptFile, 'utf8'), path.relative(cwd, promptFile));
        const file = path.join(agentsDir, `${role}.md`);
        const current = existsSync(file) ? readFileSync(file, 'utf8') : null;

        return {
            file,
            content,
            changed: current !== content,
        };
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
            writeFileSync(file, content);
        }
    }

    return {
        written: changed,
        drift: [],
        errors,
    };
};

#!/usr/bin/env node
import {parseArgs} from 'node:util';

import {
    ConfigError,
    loadConfig,
    resolveRole,
} from '../lib/config.mjs';
import {listGoModels, modelReport} from '../lib/opencode/models.mjs';

const {values} = parseArgs({options: {cwd: {type: 'string'}}});
const cwd = values.cwd ?? process.cwd();

try {
    const config = loadConfig({cwd});
    const live = listGoModels({cwd});

    if (live.error) {
        process.stderr.write(`agent-roles: ${live.error}\n`);
        process.exit(1);
    }

    const {unclassified, missing} = modelReport(config, live.models);
    const lines = [`OpenCode Go offers ${live.models.length} model(s).`];

    for (const role of Object.keys(config.roles)) {
        const resolved = resolveRole(config, role);

        if (resolved.provider === 'opencode') {
            const selected = resolved.models.find(model => live.models.includes(model));

            if (!selected) process.exitCode = 1;

            lines.push(`${role} (tier ${resolved.tier}, ${resolved.effort}): ${selected ?? 'NO CANDIDATE AVAILABLE'} ← ${resolved.models.join(', ')}`);
        }
    }

    lines.push(`Not offered any more (tiers.opencode): ${missing.join(', ') || 'none'}`);
    lines.push(`Unclassified (add to tiers.opencode + modelEfforts.opencode to use): ${unclassified.join(', ') || 'none'}`);
    process.stdout.write(`${lines.join('\n')}\n`);
} catch (error) {
    if (!(error instanceof ConfigError)) throw error;

    process.stderr.write(`agent-roles: ${error.message}\n`);
    process.exitCode = 1;
}

import {readFileSync} from 'node:fs';
import path from 'node:path';

import {acceptUpstream, checkUpstream} from './lock.mjs';
import {
    FlowError,
    resolvePluginRoot,
    skillDir,
} from './upstream.mjs';

const usage = 'Usage: node tools/agent-flows/bin/upstream.mjs check | resolve <skill> | accept | session-start';

const report = result => {
    const lines = [`Upstream: ${result.lockedVersion ?? 'unreviewed'} → ${result.version}`];

    if (result.metadataChanged) {
        lines.push('Plugin version or monitored skill set is not reviewed.');
    }

    for (const skill of result.missing) {
        lines.push(`Missing skill: ${skill}`);
    }

    for (const {
        skill,
        files,
        diff,
    } of result.changed) {
        lines.push(`Changed ${skill}: ${files.join(', ')}`, diff);
    }

    lines.push('Review the changes first. Only the user may run: node tools/agent-flows/bin/upstream.mjs accept');

    return `${lines.join('\n')}\n`;
};

const hookWarning = message => ({
    exitCode: 0,
    stdout: `${JSON.stringify({hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `Agent flows warning: ${message}\nTell the user once. Do not accept upstream changes yourself.`,
    }})}\n`,
    stderr: '',
});

/** CLI boundary; fixture options keep tests independent of the user's plugin installation. */
export const runCli = (args, options) => {
    const [command, name] = args;
    const sessionStart = command === 'session-start';

    try {
        if (![
            'resolve',
            'check',
            'accept',
            'session-start',
        ].includes(command)
            || args.length !== (command === 'resolve' ? 2 : 1)) {
            throw new FlowError(usage);
        }

        let stdout;
        let exitCode = 0;

        if (command === 'resolve') {
            const config = JSON.parse(readFileSync(path.join(options.toolDir, 'flows.json'), 'utf8'));

            if (!config.skills.includes(name)) {
                throw new FlowError(`skill ${name} is not monitored by flows.json`);
            }

            const {root} = resolvePluginRoot({...options, plugin: config.plugin});

            stdout = `${path.join(skillDir(root, name), 'SKILL.md')}\n`;
        } else if (command === 'accept') {
            const lock = acceptUpstream(options);

            stdout = `Recorded reviewed upstream ${lock.version} (${Object.keys(lock.skills).length} skills).\n`;
        } else {
            const result = checkUpstream(options);

            if (sessionStart) {
                const summary = `Upstream ${result.lockedVersion ?? 'unreviewed'} → ${result.version}; `
                    + `${result.changed.length} changed skills, ${result.missing.length} missing. `
                    + 'Version or monitored-set changes also require review. Run moon run root:upstream-check for the full diff.';

                return result.clean ? {
                    exitCode,
                    stdout: '',
                    stderr: '',
                } : hookWarning(summary);
            }

            stdout = result.clean ? `Upstream ${result.version}: reviewed skills unchanged.\n` : report(result);
            exitCode = result.clean ? 0 : 1;
        }

        return {
            exitCode,
            stdout,
            stderr: '',
        };
    } catch (error) {
        return sessionStart ? hookWarning(error.message) : {
            exitCode: 2,
            stdout: '',
            stderr: `${error.message}\n`,
        };
    }
};

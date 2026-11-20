import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {adapters} from './adapters/index.mjs';
import {
    ConfigError,
    loadConfig,
    resolveRole,
    validateConfig,
    withModelFields,
} from './config.mjs';
import {listGoModels} from './opencode/models.mjs';
import {runOpenCode} from './opencode/run.mjs';

export const EXIT = {
    ok: 0,
    failed: 1,
    usage: 2,
    unavailable: 3,
};

const usage = message => ({
    exitCode: EXIT.usage,
    output: '',
    message: `agent-roles: ${message}`,
});

const resolveForAsk = ({
    role,
    cwd,
    overrides,
}) => {
    const config = loadConfig({cwd});

    if (!config.roles[role]) {
        throw new ConfigError(`unknown role ${role}`);
    }

    // The fallback subagent runs from the generated agent file, i.e. the stored config without overrides.
    const stored = resolveRole(config, role);
    const subagent = stored.fallback ?? {model: stored.model, effort: stored.effort};

    config.roles[role] = withModelFields(config.roles[role], overrides);

    const errors = validateConfig(config);

    if (errors.length > 0) {
        throw new ConfigError(errors.join('\n'));
    }

    const resolved = resolveRole(config, role);

    // A one-off Go model must not change the role's price tier.
    if (stored.provider === 'opencode' && resolved.provider === 'opencode' && resolved.tier !== stored.tier) {
        throw new ConfigError(`${role}: model ${resolved.model} is tier ${resolved.tier}; the role requires tier ${stored.tier}`);
    }

    return {
        config,
        resolved,
        subagent,
    };
};

/** Spawns the CLI; resolves with its output or the reason it stopped early. */
const execute = ({
    adapter,
    invocation,
    cwd,
    env,
    timeoutSeconds,
}) => new Promise(resolve => {
    const child = spawn(invocation.cmd, invocation.args, {cwd, env: {...process.env, ...env}});
    let stdout = '';
    let stderr = '';
    let stopped = null;
    let settled = false;
    const finish = result => {
        if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve({
                stdout,
                stderr,
                ...result,
            });
        }
    };
    const stop = reason => {
        stopped = reason;
        child.kill('SIGKILL');
    };
    const timer = setTimeout(() => stop({timedOut: true}), timeoutSeconds * 1000);

    child.stdout.on('data', chunk => {
        stdout += chunk;
    });
    child.stderr.on('data', chunk => {
        stderr += chunk;

        const cause = adapter.detectUnavailable(stderr);

        if (cause && !stopped) {
            stop({unavailableCause: cause});
        }
    });
    child.on('error', spawnError => finish({spawnError}));
    child.on('close', code => finish({code, ...stopped}));
    child.stdin.on('error', () => {});
    child.stdin.end(invocation.stdin ?? '');
});

const unavailable = ({
    resolved,
    subagent,
    cause,
    fix,
}) => ({
    exitCode: EXIT.unavailable,
    output: '',
    message: `agent-roles: ${resolved.provider} unavailable (${cause}). Fix: ${fix}. `
        + `Fallback: ${subagent.model}/${subagent.effort} (subagent ${resolved.role})`,
});

/** First role candidate that OpenCode Go offers now; otherwise an unavailable result before anything starts. */
const selectGoModel = ({
    resolved,
    subagent,
    cwd,
    env,
}) => {
    const live = listGoModels({cwd, env});

    if (live.error) {
        return {result: unavailable({
            resolved,
            subagent,
            cause: live.error,
            fix: live.spawnError?.code === 'ENOENT' ? 'install OpenCode' : 'check `opencode models` and the OpenCode Go login',
        })};
    }

    const model = resolved.models.find(candidate => live.models.includes(candidate));

    return model ? {model} : {result: unavailable({
        resolved,
        subagent,
        cause: `none of ${resolved.models.join(', ')} is offered by OpenCode Go`,
        fix: 'run `moon run root:agents-models` and update the role candidates',
    })};
};

const failed = (resolved, cause) => ({
    exitCode: EXIT.failed,
    output: '',
    message: `agent-roles: ${resolved.provider} failed: ${cause}`,
});

export const runAsk = async ({
    role,
    prompt,
    cwd = process.cwd(),
    overrides = {},
    env = {},
    timeoutSeconds,
    task,
}) => {
    let config;
    let resolved;
    let subagent;

    try {
        ({
            config,
            resolved,
            subagent,
        } = resolveForAsk({
            role,
            cwd,
            overrides,
        }));
    } catch (error) {
        if (error instanceof ConfigError) {
            return usage(error.message);
        }

        throw error;
    }

    if (resolved.provider === 'opencode') {
        const selected = selectGoModel({
            resolved,
            subagent,
            cwd,
            env,
        });

        if (selected.result) return selected.result;

        return runOpenCode({
            resolved: {...resolved, model: selected.model},
            subagent,
            prompt,
            task,
            cwd,
            env,
            seconds: timeoutSeconds ?? config.timeoutSeconds,
        });
    }

    if (resolved.kind !== 'read') {
        return usage(`role ${role} is a ${resolved.kind} role; only Claude may run it. Spawn it with the Agent tool`);
    }

    if (resolved.provider === 'claude') {
        return usage(`role ${role} runs as Claude subagent; spawn it with the Agent tool`);
    }

    const adapter = adapters[resolved.provider];
    const scratch = mkdtempSync(path.join(tmpdir(), 'agent-roles-ask-'));
    const seconds = timeoutSeconds ?? config.timeoutSeconds;

    const outFile = path.join(scratch, 'answer.txt');

    try {
        const invocation = adapter.buildInvocation({
            ...resolved,
            cwd,
            prompt,
            outFile,
        });
        const result = await execute({
            adapter,
            invocation,
            cwd,
            env,
            timeoutSeconds: seconds,
        });

        if (result.unavailableCause) {
            return unavailable({
                resolved,
                subagent,
                ...adapter.classifyFailure({stderr: result.unavailableCause}),
            });
        }

        if (result.timedOut) {
            return {
                exitCode: EXIT.failed,
                output: '',
                message: `agent-roles: ${resolved.provider} timed out after ${seconds}s`,
            };
        }

        if (result.spawnError || result.code !== 0) {
            const failure = adapter.classifyFailure(result);

            return failure.kind === 'unavailable' ? unavailable({
                resolved,
                subagent,
                ...failure,
            }) : failed(resolved, failure.cause);
        }

        // Some CLIs report errors or empty answers with exit code 0.
        const outputFailure = adapter.outputFailure({stdout: result.stdout, outFile});

        if (outputFailure) {
            const failure = adapter.classifyFailure(result);

            return failure.kind === 'unavailable' ? unavailable({
                resolved,
                subagent,
                ...failure,
            }) : failed(resolved, outputFailure);
        }

        return {exitCode: EXIT.ok, output: adapter.parseOutput({stdout: result.stdout, outFile})};
    } finally {
        rmSync(scratch, {recursive: true, force: true});
    }
};

import {createHash} from 'node:crypto';
import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {classify} from '../adapters/common.mjs';
import {ConfigError, toolRoot} from '../config.mjs';
import {renderOpenCodeAgent} from '../render.mjs';
import {createEventReader} from './events.mjs';
import {executeOpenCode} from './process.mjs';
import {openRun} from './state.mjs';

const errorResult = (message, exitCode = 2) => ({
    exitCode,
    output: '',
    message: `agent-roles: ${message}`,
});

const validateInput = ({
    task,
    prompt,
    seconds,
}) => {
    if (process.platform === 'win32') return 'OpenCode worker process-group isolation currently requires POSIX';

    if (typeof task !== 'string' || !(/^[a-z0-9][a-z0-9_-]{0,79}$/).test(task)) return 'OpenCode requires --task <safe-feature-or-cycle-key>';

    if (!prompt?.trim() || !Number.isFinite(seconds) || seconds <= 0) return 'prompt must be nonempty and timeout must be positive';

    return null;
};

const failureCause = result => result.killError ?? result.spawnError?.message ?? result.error ?? result.stopped
    ?? (result.code !== 0 ? `CLI exited ${result.code}: ${result.stderr}` : !result.completed ? 'No completed OpenCode response' : !result.output.trim() ? 'Empty OpenCode response' : null);

const failureOutcome = ({
    resolved,
    subagent,
    result,
    cause,
    logDir,
}) => {
    const failure = classify({
        spawnError: result.spawnError,
        text: `${result.error ?? ''}\n${result.stderr}`,
        fixes: {
            install: 'install OpenCode',
            'not logged in': 'connect OpenCode Go with `opencode auth login`',
            quota: 'wait for OpenCode Go allowance to reset',
        },
    });
    const safeFallback = !result.killError && failure.kind === 'unavailable' && (resolved.kind === 'read' || result.spawnError?.code === 'ENOENT');

    return {
        output: '',
        exitCode: safeFallback ? 3 : 1,
        message: `agent-roles: opencode failed: ${cause}. Logs: ${logDir}. `
            + (safeFallback ? `Fix: ${failure.fix}. Fallback: ${subagent.model}/${subagent.effort} (subagent ${resolved.role})`
                : 'Inspect the working diff, untracked files and run logs before handing off or retrying; no automatic fallback.'),
    };
};

export const runOpenCode = async ({
    resolved,
    subagent,
    prompt,
    task,
    cwd,
    env,
    seconds,
}) => {
    const invalid = validateInput({
        task,
        prompt,
        seconds,
    });

    if (invalid) return errorResult(invalid);

    const role = resolved.role;
    const agentFile = path.join(cwd, '.opencode', 'agents', `roles-${role}.md`);
    const definition = renderOpenCodeAgent(resolved, readFileSync(path.join(toolRoot, 'prompts', `${role}.md`), 'utf8'));

    if (!existsSync(agentFile) || readFileSync(agentFile, 'utf8') !== definition) return errorResult('OpenCode agent is missing or stale; run agents-sync');

    const fingerprint = createHash('sha256').update(JSON.stringify([
        cwd,
        resolved,
        definition,
    ])).digest('hex');
    let run;

    try {
        run = openRun({
            cwd,
            task,
            role,
            fingerprint,
            kind: resolved.kind,
        });
    } catch (error) {
        return errorResult(error.message, error instanceof ConfigError ? 2 : 1);
    }

    let retainLock = false;

    run.save({model: resolved.model});

    try {
        const model = resolved.effort === 'default' ? resolved.model : `${resolved.model}#${resolved.effort}`;
        const args = [
            'run',
            '--standalone',
            '--format',
            'json',
            '--agent',
            `roles-${role}`,
            '--model',
            model,
        ];

        if (run.state.sessionId) args.push('--session', run.state.sessionId);

        writeFileSync(path.join(run.logDir, 'prompt.txt'), prompt, {mode: 0o600});
        writeFileSync(path.join(run.logDir, 'stdout.jsonl'), '', {mode: 0o600});
        writeFileSync(path.join(run.logDir, 'stderr.log'), '', {mode: 0o600});

        const result = await executeOpenCode({
            args,
            prompt,
            cwd,
            env,
            seconds,
            logDir: run.logDir,
            reader: createEventReader(run.state.sessionId),
            onSession: sessionId => run.save({sessionId}),
            onStart: workerPid => run.save({workerPid}),
        });

        retainLock = Boolean(result.killError);

        const cause = failureCause(result);
        let outcome = {
            exitCode: 0,
            output: result.output,
            logDir: run.logDir,
            sessionId: result.sessionId,
            cleanupConfirmed: !result.killError,
            workerPids: result.workerPids,
        };

        if (cause) {
            outcome = {
                ...outcome,
                ...failureOutcome({
                    resolved,
                    subagent,
                    result,
                    cause,
                    logDir: run.logDir,
                }),
            };
        }

        return run.finish(outcome);
    } finally {
        if (!retainLock) run.release();
    }
};

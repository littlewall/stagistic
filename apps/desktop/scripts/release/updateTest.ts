import {
    mkdirSync,
    writeFileSync,
} from 'node:fs';
import {join} from 'node:path';

import {readReleaseNumbers} from '@stagistic/release-notes/node';

import {resolveReleaseNumber} from './lib';
import {
    ask,
    lines,
    root,
    workDir,
} from './updateTestIo';
import {
    parseAnswer,
    parseUpdateTestArgs,
    renderReport,
    type ReportEntry,
    STEPS,
} from './updateTestLib';
import {
    type State,
    stepHandlers,
    stopServer,
} from './updateTestSteps';

const main = async (): Promise<void> => {
    const {fromIndex} = parseUpdateTestArgs(process.argv.slice(2));
    const base = resolveReleaseNumber(readReleaseNumbers(root));
    const startedAt = new Date().toISOString();
    const state: State = {
        base,
        env: {...process.env},
        archiveServed: false,
        updateStartedAt: Date.now(),
        answers: [],
    };
    const entries: ReportEntry[] = [];
    const writeReport = (): void => {
        mkdirSync(workDir, {recursive: true});
        writeFileSync(join(workDir, 'report.md'), renderReport({
            base,
            startedAt,
            entries,
            answers: state.answers,
        }));
        console.log(`Report: ${join(workDir, 'report.md')}`);
    };

    mkdirSync(workDir, {recursive: true});

    for (const [index, step] of STEPS.entries()) {
        const started = Date.now();
        const entry: ReportEntry = {
            step: step.title,
            status: 'SKIP',
            startedAt: new Date(started).toISOString().slice(11, 19),
            seconds: 0,
            notes: [],
        };

        entries.push(entry);

        if (index < fromIndex) {
            entry.notes = ['resumed with --from'];
            continue;
        }

        console.log(`\n=== Step ${index + 1}/${STEPS.length}: ${step.title} ===`);

        let answer;

        while (answer === undefined) {
            answer = parseAnswer(await ask('Enter = run, s = skip, q = quit: '));
        }

        if (answer === 'quit') {
            entry.notes = ['quit'];
            await stopServer(state);
            writeReport();

            return;
        }

        if (answer === 'skip') {
            entry.notes = ['skipped by user'];
            continue;
        }

        try {
            const outcome = await stepHandlers[step.id](state);

            entry.status = outcome.status;
            entry.notes = outcome.notes;
        } catch (error) {
            entry.status = 'FAIL';
            entry.notes = [(error as Error).message];
        }

        entry.seconds = Math.round((Date.now() - started) / 1000);
        console.log(`${entry.status}: ${step.title} ${entry.notes.join('; ')}`);

        if (entry.status === 'FAIL') {
            console.log('Stopping. Fix the problem and resume with: moon run desktop:update-test -- --from ' + step.id);
            await stopServer(state);
            writeReport();
            process.exitCode = 1;

            return;
        }
    }

    writeReport();
};

main().then(() => {
    lines.close();
}).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
